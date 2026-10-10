import { BusinessConfig } from "../models/BusinessConfig.js";
import { logAction } from "../models/AuditLog.js";
import { ok, fail } from "../utils/respond.js";

export async function getPublicConfig(_req, res) {
  try {
    let config = await BusinessConfig.findOne({ key: "default" });
    const envWhatsapp = process.env.WHATSAPP_NUMBER || "";

    const data = {
      businessName: config?.businessName || "Cloth Market",
      whatsappNumber: config?.whatsappNumber || envWhatsapp || "",
      paymentQrUrl: config?.paymentQrUrl || "",
      upiId: config?.upiId || "",
      paymentInstructions:
        config?.paymentInstructions ||
        "Scan the official Cloth Market QR code, complete payment, and send a screenshot with your transaction ID on WhatsApp."
    };

    return ok(res, data, "Public configuration fetched.");
  } catch (err) {
    return fail(res, 500, `Failed to load configuration: ${err.message}`);
  }
}

export async function getAdminConfig(_req, res) {
  try {
    let config = await BusinessConfig.findOne({ key: "default" });
    if (!config) {
      config = await BusinessConfig.create({
        key: "default",
        whatsappNumber: process.env.WHATSAPP_NUMBER || "",
        businessName: "Cloth Market"
      });
    }
    return ok(res, config, "Admin configuration fetched.");
  } catch (err) {
    return fail(res, 500, `Failed to load configuration: ${err.message}`);
  }
}

export async function updateAdminConfig(req, res) {
  const { whatsappNumber, paymentQrUrl, upiId, businessName, paymentInstructions } = req.body;

  try {
    let config = await BusinessConfig.findOne({ key: "default" });
    if (!config) {
      config = new BusinessConfig({ key: "default" });
    }

    if (whatsappNumber !== undefined) {
      // Clean phone: digits only, or with optional leading '+'
      config.whatsappNumber = String(whatsappNumber).trim();
    }
    if (paymentQrUrl !== undefined) {
      config.paymentQrUrl = String(paymentQrUrl).trim();
    }
    if (upiId !== undefined) {
      config.upiId = String(upiId).trim();
    }
    if (businessName !== undefined) {
      config.businessName = String(businessName).trim();
    }
    if (paymentInstructions !== undefined) {
      config.paymentInstructions = String(paymentInstructions).trim();
    }

    config.updatedBy = req.user?.name || req.user?.email || "Admin";
    await config.save();

    if (req.user) {
      await logAction({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: "update_business_config",
        targetId: config.id,
        metadata: {
          whatsappNumber: config.whatsappNumber,
          hasQrUrl: Boolean(config.paymentQrUrl),
          upiId: config.upiId
        }
      });
    }

    return ok(res, config, "Configuration updated successfully.");
  } catch (err) {
    return fail(res, 500, `Failed to update configuration: ${err.message}`);
  }
}
