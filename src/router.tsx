import { lazy, Suspense } from "react";
import ToursPage, { CategoryDestination } from "@/pages/tours";
import TourDetail from "@/pages/tours/detail";
import EsimsPage from "@/pages/esims";
import EsimDetail from "@/pages/esims/detail";
import HistoryPage from "@/pages/history";
import SupportPage from "@/pages/support";
import Layout from "@/components/layout";
import NotFoundPage, { RouteErrorPage } from "@/pages/not-found";
import ProductListPage from "@/pages/catalog/product-list";
import CategoryListPage from "@/pages/catalog/category-list";
import ProductDetailPage from "@/pages/catalog/product-detail";
import HomePage from "@/pages/home";
import ProfilePage from "@/pages/profile";
import SearchPage from "@/pages/search";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { getBasePath } from "@/utils/zma";

const FlightSearchPage = lazy(() => import("@/pages/flights"));
const AdminPage = lazy(() => import("@/pages/admin"));

const router = createBrowserRouter(
  [
    { path: "/admin", element: <Suspense fallback={<p role="status" className="p-6">Đang tải trang quản trị…</p>}><AdminPage /></Suspense>, errorElement: <RouteErrorPage /> },
    {
      path: "/",
      element: <Layout />,
      errorElement: <RouteErrorPage />,
      children: [
        { path: "/support", element: <SupportPage />, handle: { title: "Hỗ trợ & tư vấn" } },
        { path: "/history", element: <HistoryPage />, handle: { title: "Lịch sử của bạn" } },
        { path: "/esims", element: <EsimsPage />, handle: { title: "eSIM du lịch" } },
        { path: "/esims/:id", element: <EsimDetail />, handle: { title: "Chi tiết eSIM", scrollRestoration: 0 } },
        { path: "/tours", element: <ToursPage />, handle: { title: "Tour du lịch" } },
        { path: "/tours/:id", element: <TourDetail />, handle: { title: "Chi tiết tour", scrollRestoration: 0 } },
        {
          path: "/",
          element: <HomePage />,
          handle: {
            logo: true,
          },
        },
        {
          path: "/flights",
          element: <FlightSearchPage />,
          handle: {
            title: "Đặt vé máy bay",
          },
        },
        {
          path: "/categories",
          element: <CategoryListPage />,
          handle: {
            title: "Danh mục tiện ích",
            back: false,
          },
        },
        {
          path: "/tin-tuc",
          element: <ProductListPage />,
          handle: {
            title: "Tin tức",
          },
        },
        {
          path: "/cart",
          element: <Navigate to="/history" replace />,
          handle: {
            title: "Lịch sử của bạn",
          },
        },
        {
          path: "/profile",
          element: <ProfilePage />,
          handle: {
            logo: true,
          },
        },
        {
          path: "/category/:id",
          element: <CategoryDestination />,
          handle: {
            title: ({ categories, params }) =>
              categories.find(
                (c) => c.id === Number(params.id)
              )?.name,
          },
        },
        {
          path: "/product/:id",
          element: <ProductDetailPage />,
          handle: {
            title: "Bài viết & ưu đãi",
            scrollRestoration: 0,
          },
        },
        {
          path: "/search",
          element: <SearchPage />,
          handle: {
            title: "Tìm kiếm",
          },
        },
        { path: "*", element: <NotFoundPage />, handle: { title: "Không tìm thấy trang" } },
      ],
    },
  ],
  {
    basename: getBasePath(),
  }
);

export default router;
