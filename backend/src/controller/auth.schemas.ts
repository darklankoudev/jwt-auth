import { z } from "zod";

const emailSchemaSame = z.string().email().min(1).max(255)
const passwordSchemaSame = z.string().min(6).max(255)

export const loginSchema = z.object({
    email: emailSchemaSame,
    password: passwordSchemaSame,
    userAgent: z.string().optional()
})

export const registerSchema = loginSchema
.extend({
    confirmPassword: z.string().min(6).max(255),
})
.refine(
    (data) => data.password === data.confirmPassword, {
        message: "Password does not match",
        path: ["confirmPassword"]
    }
)

export const verificationCodeSchema = z.string().min(1).max(24)