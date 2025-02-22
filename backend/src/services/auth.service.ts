import UserModel from "@models/user.model"
import VerificationCodeModel from "@models/verificationCode.model"
import VerificationCodeType from "@constants/verificationCode"
import { ONE_DAY_MS, oneYearFromNow, thirtyDaysFromNow } from "@utils/date"
import SessionModel from "@models/session.model"
import { appAssert } from "@utils/appAssert"
import { CONFLICT, INTERNAL_SERVER_ERROR, NOT_FOUND, UNAUTHORIZED } from "@constants/http"
import { RefreshTokenPayload, refreshTokenSignOptions, signToken, verifyToken } from "@utils/jwt"
import { sendMail } from "../utils/sendMail"
import { getVerifyEmailTemplate } from "../utils/emailTemplates"
import { APP_ORIGIN } from "../constants/env"

export type AccountParams = {
    email: string,
    password: string,
    userAgent?: string
}

export const createAccount = async (data: AccountParams) => {
    const existingUser = await UserModel.exists({
        email: data.email
    })

    appAssert(!existingUser, CONFLICT, "Email already exists")

    const user = await UserModel.create({
        email: data.email,
        password: data.password,
    })

    const userId = user._id

    const verificationCode = await VerificationCodeModel.create({
        userId,
        type: VerificationCodeType.EmailVerification,
        expiresAt: oneYearFromNow()
    })

    const url = `${APP_ORIGIN}/email/verify/${verificationCode._id}}`

    const { error } = await sendMail({
        to: user.email,
        ...getVerifyEmailTemplate(url) 
    })

    if ( error) {
        console.error(error)
    }
    
    const session = await SessionModel.create({
        userId,
        userAgent: data.userAgent
    })

    const accessToken = signToken({userId, sessionId: session._id})

    const refreshToken = signToken({sessionId: session._id}, refreshTokenSignOptions)

    return {
        user,
        accessToken,
        refreshToken
    }
}

export const loginUser = async (data: AccountParams) => {

    const user = await UserModel.findOne({email: data.email})
    appAssert(user, UNAUTHORIZED, "Invalid email or password")

    const isValid = await user.comparePassword(data.password)
    appAssert(isValid, UNAUTHORIZED, "Invalid email or password")

    const userId = user._id

    const session = await SessionModel.create({
        userId,
        userAgent: data.userAgent
    })

    const sessionInfo = {
        sessionId: session._id
    }

    const accessToken = signToken({...sessionInfo, userId})

    const refreshToken = signToken(sessionInfo, refreshTokenSignOptions)

    return {
        user: user.omitPassword(),
        accessToken,
        refreshToken
    }
}

export const refreshUserAccessToken = async (refreshToken: string) => {
    const { payload } = verifyToken<RefreshTokenPayload>(refreshToken, { secret: refreshTokenSignOptions.secret })
    appAssert(payload, UNAUTHORIZED, "Invalid refresh token")

    const session = await SessionModel.findById(payload.sessionId)
    const now = Date.now()
    appAssert(session && session.expiresAt.getTime() > now, UNAUTHORIZED, "Session expired")

    const sessionNeedRefresh = session.expiresAt.getTime() - now <= ONE_DAY_MS
    if(sessionNeedRefresh) {
        session.expiresAt = thirtyDaysFromNow()
        await session.save()
    }

    const newRefreshToken = sessionNeedRefresh ? signToken({sessionId: session._id}, refreshTokenSignOptions) : undefined

    const accessToken = signToken({
        userId: session.userId,
        sessionId: session._id
    })

    return {
        accessToken,
        newRefreshToken
    }
}

export const verifyEmail = async (code: string) =>{
    const validateCode = await VerificationCodeModel.findOne({
        _id: code,
        type: VerificationCodeType.EmailVerification,
        expiresAt: { $gt: new Date()}
    })
    appAssert(validateCode, NOT_FOUND, "Invalid or expired verification code")

    const updateUser = await UserModel.findByIdAndUpdate(
        validateCode.userId,
        {verified: true},
        {new: true}
    )
    appAssert(updateUser, INTERNAL_SERVER_ERROR, "Failed to verify email")

    await validateCode.deleteOne()

    return {
        user: updateUser.omitPassword()
    }
}