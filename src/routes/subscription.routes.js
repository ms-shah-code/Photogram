import { Router } from "express";
import { 
    toggleSubscription, 
    getChannelSubscribers, 
    getUserSubscribedChannels 
} from "../controllers/subscriber.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// ✅ Subscribe / Unsubscribe to a channel
router.post("/toggle/:channelId", verifyJWT, toggleSubscription);

// ✅ Get all subscribers of a channel
router.get("/channel/:channelId/subscribers", verifyJWT, getChannelSubscribers);

// ✅ Get channels a user has subscribed to
router.get("/me/subscribed", verifyJWT, getUserSubscribedChannels);

export default router;
