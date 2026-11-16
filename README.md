# BilaChat 2.0 — Vietnamese AI Chat

BilaChat là ứng dụng AI chat chạy tĩnh trên GitHub Pages, giao diện sáng theo phong cách ChatGPT/DeepSeek, hỗ trợ API OpenAI-compatible do người dùng tự cấu hình.

**Kiến trúc:** Browser UI → API do người dùng cấu hình → phản hồi Unicode tiếng Việt; nhật ký thao tác công khai → CVNSS4.0 v5 audit-safe. Bộ mã không được trình bày như khả năng suy luận của mô hình.

## Chạy nhanh

1. Mở `index.html` qua local HTTP server, ví dụ `python -m http.server 8080`, hoặc bật GitHub Pages trong **Settings → Pages → Deploy from a branch → main / root**.
2. Mở **Cài đặt** và nhập endpoint Chat Completions có hỗ trợ CORS, model, API key. Mặc định: `https://api.deepseek.com/chat/completions`, model `deepseek-chat`.
3. Chọn **Thử kết nối** rồi gửi tin. API key chỉ lưu trong bộ nhớ phiên (`sessionStorage`) mặc định; tùy chọn nhớ khóa lưu tại `localStorage` là **không an toàn trên thiết bị dùng chung**. Không đặt khóa trong GitHub.
4. Các khả năng tìm kiếm web, đọc liên kết, PDF, microphone và kết xuất phụ thuộc API/ quyền truy cập/ CDN; lỗi được hiển thị rõ ràng, không giả lập kết quả.

## Chức năng

- Nhiều cuộc trò chuyện, tìm kiếm, tiêu đề tự động, đổi tên, xóa.
- Cây phiên bản hội thoại: sửa câu hỏi để tạo nhánh mới; tạo lại phản hồi thành nhánh song song; chuyển nhánh.
- Streaming SSE, dừng tạo, chế độ deep thinking tùy nhà cung cấp, nhật ký CVNSS4.0 (trạng thái công khai).
- Upload ảnh/text/PDF, kéo thả/dán, nhận dạng lời nói qua Web Speech API, tổng hợp giọng nói bằng speechSynthesis.
- Markdown + DOMPurify, syntax highlighting, KaTeX, Mermaid, ZIP import/export (không kèm API key).
- Chủ đề sáng/tối, giao diện Việt/English/中文; **đầu ra AI luôn được yêu cầu bằng tiếng Việt Unicode**.
- Tìm kiếm web qua Tavily (tự nhập key) và đọc URL qua Jina Reader (tùy chọn, chuyển URL tới bên thứ ba). Các chức năng này cần dịch vụ cho phép CORS.

## Cảnh báo quan trọng

- **Ứng dụng tĩnh không thể bảo vệ API key khỏi chính trình duyệt**. Dùng khóa giới hạn quyền và hạn mức, hoặc máy chủ proxy bảo mật cho triển khai công khai.
- Không gửi các khóa bí mật trong URL hay lịch sử export. ZIP chỉ chứa nội dung cuộc trò chuyện.
- Bật deep thinking **không bảo đảm** model hỗ trợ suy luận chuyên sâu; nhật ký CVNSS4.0 hiển thị là trạng thái xử lý có thể kiểm chứng, **không phải chain-of-thought ẩn**.
- CVNSS4.0 có ánh xạ nhiều-một, giải mã có thể nhập nhằng; luôn giữ câu trả lời Unicode gốc của AI, không tự chuyển ngược toàn bộ câu trả lời.
- Website đọc URL qua Jina Reader hoặc tìm kiếm Tavily nghĩa là nội dung truy vấn/URL rời khỏi trình duyệt và đi tới nhà cung cấp đó.

### Nguồn và giấy phép

BilaChat phát triển dựa trên tệp minh họa Bilabot được cung cấp và bộ `CVNSSConverter.VERSION = 5.0.0-audit-safe`. CVNSS4.0 do Trần Tư Bình và Kiều Trường Lâm đề xuất; tích hợp phần mềm của Long Ngo. MIT (xem LICENSE).