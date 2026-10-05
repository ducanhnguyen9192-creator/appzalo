import FlightSearchPage from "@/pages/flights";
import ToursPage, { CategoryDestination } from "@/pages/tours";
import TourDetail from "@/pages/tours/detail";
import EsimsPage from "@/pages/esims";
import EsimDetail from "@/pages/esims/detail";
import AdminPage from "@/pages/admin";
import Layout from "@/components/layout";
import CartPage from "@/pages/cart";
import ProductListPage from "@/pages/catalog/product-list";
import CategoryListPage from "@/pages/catalog/category-list";
import ProductDetailPage from "@/pages/catalog/product-detail";
import HomePage from "@/pages/home";
import ProfilePage from "@/pages/profile";
import SearchPage from "@/pages/search";
import { createBrowserRouter } from "react-router-dom";
import { getBasePath } from "@/utils/zma";

const router = createBrowserRouter(
  [
    { path: "/admin", element: <AdminPage /> },
    {
      path: "/",
      element: <Layout />,
      children: [
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
          element: <CartPage />,
          handle: {
            title: "Giỏ hàng",
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
      ],
    },
  ],
  {
    basename: getBasePath(),
  }
);

export default router;
