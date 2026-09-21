import { Router } from "express";
import { fashionChat, generateOutfit, getRecommendations, sizeRecommendation } from "../controllers/aiController.js";

const router = Router();

router.get("/recommendations", getRecommendations);
router.post("/outfit-generator", generateOutfit);
router.post("/chat", fashionChat);
router.post("/size-recommendation", sizeRecommendation);

export default router;
