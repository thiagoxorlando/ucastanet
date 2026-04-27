import path from "path";
import EfiPay from "sdk-node-apis-efi";

// Returns a configured EfiPay SDK instance for PIX operations.
// The SDK internally uses pix.api.efipay.com.br for PIX endpoints and
// fetches the OAuth token from that same host, so token and requests always
// share the same origin (avoids invalid_token from cross-host tokens).
export function getEfiSdk(): EfiPay {
  const certPath   = process.env.EFI_CERTIFICATE_PATH;
  const certBase64 = process.env.EFI_CERT_BASE64;

  let certificate: string;
  let cert_base64: boolean;

  if (certPath) {
    certificate = path.isAbsolute(certPath)
      ? certPath
      : path.resolve(process.cwd(), certPath);
    cert_base64 = false;
  } else if (certBase64) {
    certificate = certBase64;
    cert_base64 = true;
  } else {
    throw new Error("[efiSdk] No certificate configured. Set EFI_CERTIFICATE_PATH or EFI_CERT_BASE64.");
  }

  return new EfiPay({
    sandbox:       false,
    client_id:     process.env.EFI_CLIENT_ID!,
    client_secret: process.env.EFI_CLIENT_SECRET!,
    certificate,
    cert_base64,
    validateMtls:  false,
  });
}
