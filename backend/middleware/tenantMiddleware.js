import Organization from "../models/Organization.js";
import logger from "../utils/logger.js";

export const tenantMiddleware = async (req, res, next) => {
    try {
        const tenantId = req.headers["x-tenant-id"];

        if (!tenantId) {
            // No tenant specified, proceed as standard (global) request
            // Or deny if strict multi-tenancy is required.
            // For now, we allow global access (e.g. for superadmin or public site)
            return next();
        }

        const organization = await Organization.findById(tenantId);

        if (!organization) {
            logger.warn(`Tenant not found for ID: ${tenantId}`);
            return res.status(404).json({ message: "Organization not found" });
        }

        req.organization = organization;
        next();
    } catch (error) {
        logger.error({ message: "Error in tenant middleware", error: error.message });
        res.status(500).json({ message: "Internal Server Error" });
    }
};
