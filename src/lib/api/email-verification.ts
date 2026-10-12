import {apiRequest} from "./client";

export type VerificationCodeResponse = {
  verified: boolean;
  expiresInSeconds: number;
  resendAfterSeconds: number;
};

export function requestVerificationCode(token: string) {
  return apiRequest<VerificationCodeResponse>("/auth/email-verification/code", {
    method: "POST",
    token,
  });
}

export function verifyEmailCode(token: string, code: string) {
  return apiRequest<{verified: true}>("/auth/email-verification/verify", {
    method: "POST",
    token,
    body: {code},
  });
}
