import { DetailSkeleton } from "@/components/catalog-skeleton";
import { usePageTitle } from "@/utils/page-title";
import ContentImage from "@/components/content-image";
import { Link, useParams } from "react-router-dom";
import { Product } from "@/types";
import { useContentData } from "@/utils/tours";
import { contentImage } from "@/utils/content-image";
import ShareButton from "./share-buttont";

type Article = Product & { summary?: string; publishedAt?: string };

export default function ProductDetailPage() {
  const { id } = useParams();
  const { data, loading, error, retry } = useContentData<Article[]>("products");
  const article = data?.find((item) => item.id === Number(id));
  usePageTitle(article?.name);
  if (loading) return <DetailSkeleton label="Đang tải bài viết…" />;
  if (error) return <div className="bg-white rounded-2xl p-6 space-y-4"><h1 className="text-xl font-semibold">Chưa tải được bài viết</h1><p role="alert" className="text-gray-600">Kiểm tra kết nối rồi thử lại.</p><button onClick={retry} className="rounded-xl bg-blue-600 text-white px-5 py-3">Thử lại</button><Link to="/tin-tuc" className="block text-blue-600">← Xem danh sách bài viết</Link></div>;
  if (!article) return <div className="bg-white rounded-2xl p-6 space-y-4"><h1 className="text-xl font-semibold">Bài viết không còn khả dụng</h1><p className="text-gray-600">Bài viết có thể đã được ẩn hoặc đường dẫn chưa đúng. Bạn có thể xem các thông tin khác bên dưới.</p><Link to="/tin-tuc" className="inline-block rounded-xl bg-blue-600 text-white px-5 py-3">Xem tin tức & ưu đãi</Link><Link to="/support" className="block text-blue-600">Liên hệ FirstClass →</Link></div>;
  return <article className="product-detail bg-white rounded-2xl overflow-hidden break-words">
    {article.image && <ContentImage src={contentImage(article.image)} alt={article.name} className="content-hero w-full object-cover" loading="eager" />}
    <div className="p-4 lg:p-8 space-y-5">
      <div><p className="text-sm text-blue-600">{article.contentType === "offer" ? "Ưu đãi" : "Tin tức & kinh nghiệm"}</p><h1 className="text-xl lg:text-3xl font-bold mt-2">{article.name}</h1>{article.publishedAt && <p className="text-sm text-gray-500 mt-2">Ngày đăng: {article.publishedAt}</p>}</div>
      {article.summary && <p className="text-gray-600 leading-7 whitespace-pre-wrap">{article.summary}</p>}
      {article.details?.map((detail, index) => <section key={index}><h2 className="text-lg font-semibold mb-3">{detail.title}</h2><p className="text-sm lg:text-base leading-7 text-gray-700 whitespace-pre-wrap">{detail.content}</p></section>)}
      <ShareButton product={{ ...article, image: contentImage(article.image) }} />
      <div className="rounded-xl bg-blue-50 p-4 space-y-3"><p className="text-sm text-gray-600">Cần tư vấn hành trình hoặc kiểm tra điều kiện ưu đãi? Trao đổi với FirstClass trước khi đặt dịch vụ.</p><Link to="/support" className="inline-block rounded-xl bg-blue-600 text-white px-5 py-3 font-medium">Nhận tư vấn →</Link></div>
      <Link to="/tin-tuc" className="inline-block text-blue-600">← Tin tức & kinh nghiệm du lịch</Link>
    </div>
  </article>;
}
