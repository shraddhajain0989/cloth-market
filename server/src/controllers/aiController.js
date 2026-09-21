import { Product } from "../models/Product.js";
import { ok } from "../utils/respond.js";

export async function getRecommendations(req, res) {
  const budget = Number(req.query.budget || 2500);
  const { category, style, occasion } = req.query;

  const query = { available: true, price: { $lte: budget } };

  if (category) {
    query.category = { $regex: `^${category}$`, $options: "i" };
  }

  if (style || occasion) {
    const searchTerms = [style, occasion].filter(Boolean).join("|");
    query.$or = [
      { tags: { $regex: searchTerms, $options: "i" } },
      { description: { $regex: searchTerms, $options: "i" } }
    ];
  }

  let items = await Product.find(query).limit(4);

  // Fallback to budget-only search if specific filters match 0 products
  if (items.length === 0) {
    items = await Product.find({ available: true, price: { $lte: budget } }).limit(4);
  }

  return ok(res, items, "AI recommendations generated.");
}

export async function generateOutfit(req, res) {
  const { occasion, budget = 3000, style, category } = req.body;
  const maxBudget = Number(budget || 3000);

  const query = { available: true, price: { $lte: maxBudget } };

  if (category) {
    query.category = { $regex: `^${category}$`, $options: "i" };
  }

  if (style || occasion) {
    const searchTerms = [style, occasion].filter(Boolean).join("|");
    query.$or = [
      { tags: { $regex: searchTerms, $options: "i" } },
      { description: { $regex: searchTerms, $options: "i text" } }
    ];
  }

  let items = await Product.find(query).limit(3);

  if (items.length === 0) {
    items = await Product.find({ available: true, price: { $lte: maxBudget } }).limit(2);
  }

  const totalPrice = items.reduce((sum, item) => sum + (item.flashSalePrice || item.price), 0);

  const summary = `Curated a ${style || "chic"} ensemble for ${
    occasion || "your upcoming event"
  } within ₹${maxBudget.toLocaleString("en-IN")}. Total outfit cost: ₹${totalPrice.toLocaleString("en-IN")}.`;

  return ok(
    res,
    {
      summary,
      totalPrice,
      budget: maxBudget,
      items
    },
    "Outfit generated successfully."
  );
}

export async function fashionChat(req, res) {
  const prompt = (req.body.prompt || "").trim().toLowerCase();

  // Extract keywords for DB lookup
  const keywords = ["jacket", "kurti", "denim", "ethnic", "party", "sneaker", "top", "dress", "streetwear"];
  const matchedKeyword = keywords.find((kw) => prompt.includes(kw));

  let recommendedProducts = [];
  if (matchedKeyword) {
    recommendedProducts = await Product.find({
      available: true,
      $or: [
        { name: { $regex: matchedKeyword, $options: "i" } },
        { category: { $regex: matchedKeyword, $options: "i" } },
        { tags: { $regex: matchedKeyword, $options: "i" } }
      ]
    }).limit(2);
  } else {
    recommendedProducts = await Product.find({ available: true }).limit(2);
  }

  let answer = `For "${req.body.prompt}", our AI Stylist recommends pairing clean statement outerwear with monochrome base layers.`;
  if (prompt.includes("party") || prompt.includes("night out")) {
    answer = `For a party look, combine a sharp jacket or cropped top with high-waisted wide trousers and statement sneakers.`;
  } else if (prompt.includes("festive") || prompt.includes("ethnic") || prompt.includes("diwali") || prompt.includes("wedding")) {
    answer = `For festive celebrations, opt for rich fabrics like silk or velvet. Check out our Ethnic Rental Closet to wear designer ethnic sets for 80% off!`;
  } else if (prompt.includes("budget") || prompt.includes("cheap") || prompt.includes("student")) {
    answer = `Looking for student budget deals? Use code STUDENT40 at checkout or browse items available for daily rental starting at ₹109/day!`;
  }

  return ok(
    res,
    {
      answer,
      recommendedProducts
    },
    "Stylist response generated."
  );
}

export async function sizeRecommendation(req, res) {
  const chest = Number(req.body.chest || 0);
  const waist = Number(req.body.waist || 0);

  let size = "M";
  let confidence = "High";
  let notes = "";

  if (chest > 0 || waist > 0) {
    const ref = chest || waist + 4;
    if (ref < 34) size = "XS";
    else if (ref < 36) size = "S";
    else if (ref < 40) size = "M";
    else if (ref < 44) size = "L";
    else size = "XL";

    notes = `Based on chest ${chest || "-"} inches and waist ${
      waist || "-"
    } inches, ${size} provides the optimal tailored fit.`;
  } else {
    confidence = "Medium";
    notes = `Chest and waist measurements were not specified. Defaulting to standard regular fit (M).`;
  }

  // Fetch in-stock products matching recommended size
  const matchingProducts = await Product.find({
    available: true,
    stock: { $gt: 0 },
    sizes: size
  }).limit(3);

  return ok(
    res,
    {
      recommendedSize: size,
      confidence,
      notes,
      matchingProducts
    },
    "Size recommendation generated."
  );
}
