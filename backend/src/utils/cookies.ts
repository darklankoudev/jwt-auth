import { CookieOptions, Response } from "express";
import { fifteenMinutesFromNow, thirtyDaysFromNow } from "./date";

const secure = process.env.NODE_ENV !== "development"
export const REFRESH_PATH = "/auth/refresh"

const defaults: CookieOptions = {
  httpOnly: true,
  sameSite: "strict",
  secure,
};

export const getAccessTokenOption = (): CookieOptions => ({
  ...defaults,
  expires: fifteenMinutesFromNow()
});

export const getRefreshTokenOption = (): CookieOptions => ({
  ...defaults,
  expires: thirtyDaysFromNow(),
  path: REFRESH_PATH,
});

type Params = {
  res: Response;
  accessToken: string;
  refreshToken: string;
};

export const setAuthCookies = ({ res, accessToken, refreshToken }: Params) =>
  res
    .cookie("accessToken", accessToken, getAccessTokenOption())
    .cookie("refreshToken", refreshToken, getRefreshTokenOption());

export const clearAuthCookies = (res: Response) => 
  res
    .clearCookie("accessToken")
    .clearCookie("refreshToken", {path: REFRESH_PATH}) 