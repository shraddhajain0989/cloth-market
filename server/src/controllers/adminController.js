import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Rental } from "../models/Rental.js";
import { User } from "../models/User.js";
import { ok } from "../utils/respond.js";

export async function getDashboard(_req, res) {
  const [totalOrders, totalUsers, totalProducts, totalRentals, revenueAgg] = await Promise.all([
    Order.countDocuments(),
    User.countDocuments(),
    Product.countDocuments(),
    Rental.countDocuments(),
    Order.aggregate([{ $group: { _id: null, total: { $sum: "$total" } } }])
  ]);

  const revenue = revenueAgg[0]?.total || 0;

  // Real sales chart — last 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const salesAgg = await Order.aggregate([
    { $match: { createdAt: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
        sales: { $sum: "$total" }
      }
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, month: "$_id", sales: 1 } }
  ]);

  const topProducts = await Product.find().sort({ reviewsCount: -1 }).limit(3);

  return ok(
    res,
    {
      kpis: { revenue, orders: totalOrders, rentals: totalRentals, users: totalUsers, products: totalProducts },
      salesChart: salesAgg,
      topProducts
    },
    "Admin dashboard fetched."
  );
}
