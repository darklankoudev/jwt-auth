import catchErrors from "@utils/catchErrors";
import { createAccount, loginUser, refreshUserAccessToken, verifyEmail } from "@services/auth.service";
import { clearAuthCookies, getAccessTokenOption, getRefreshTokenOption, setAuthCookies } from "@utils/cookies";
import { loginSchema, registerSchema, verificationCodeSchema } from "./auth.schemas";
import { AccessTokenPayload, verifyToken } from "@utils/jwt";
import SessionModel from "@models/session.model";
import { OK, UNAUTHORIZED } from "@constants/http";
import { appAssert } from "@utils/appAssert";

export const registerHandler = catchErrors( async (req, res) => {
    const request = registerSchema.parse({
        ...req.body,
        userAgent: req.headers["user-agent"]
    })

    const {user, accessToken, refreshToken} = await createAccount(request)

    return setAuthCookies({res, accessToken, refreshToken}).status(200).json(user)
})

export const loginHandler = catchErrors( async (req, res) => {
    const request = loginSchema.parse({
        ...req.body,
        userAgent: req.headers["user-agent"]
    })

    const {accessToken, refreshToken} = await loginUser(request)

    return setAuthCookies({res, accessToken, refreshToken}).status(200).json({
        message: "Logged in successfully"
    })
})

export const logoutHandler = catchErrors( async (req, res) => {
    const accessToken = req.cookies["accessToken"]

    const { payload } = verifyToken(accessToken || "")

    if (payload) await SessionModel.findByIdAndDelete(payload.sessionId)

    return clearAuthCookies(res).status(OK).json({
        message: "Logged out successfully"
    })
})

export const refreshHandler = catchErrors( async (req, res) => {
    const refreshToken = req.cookies["refreshToken"] as string || undefined
    appAssert(refreshToken, UNAUTHORIZED, "Missing refresh token")

    const {
        accessToken,
        newRefreshToken
    } = await refreshUserAccessToken(refreshToken)

    if(newRefreshToken) {
        res.cookie("refreshToken", newRefreshToken, getRefreshTokenOption())
    }

    return res.status(OK).cookie("accessToken", accessToken, getAccessTokenOption()).json({
        message: "Access token refreshed successfully"
    })
})

export const verifyEmailHandler = catchErrors( async (req, res) => {
    const verificationCode = verificationCodeSchema.parse(req.params.code)

    await verifyEmail(verificationCode)

    return res.status(OK).json({
        message: "Email verified successfully"
    })
})