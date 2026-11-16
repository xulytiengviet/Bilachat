# BilaChat 2.0 — Vietnamese AI Chat

BilaChat là ứng dụng AI chat chạy tĩnh trên GitHub Pages, giao diện sáng theo phong cách ChatGPT/DeepSeek, hỗ trợ API OpenAI-compatible do người dùng tự cấu hình.

**Kiến trúc:** Browser UI → API do người dùng cấu hình → phản hồi Unicode tiếng Việt; nhật ký thao tác công khai → CVNSS4.0 v5 audit-safe. Bộ mã không được trình bày như khả năng suy luận của mô hình.

## Chạy nhanh

1. Mở `index.html` qua local HTTP server, ví dụ `python -m http.server 8080`, hoặc bật GitHub Pages trong **Settings → Pages → Deploy from a branch → main / root**.
2. Mở **Cài đặt** và nhập endpoint Chat Completions có hỗ trợ CORS, model, API key. Mặc định: `https://api.deepseek.com/chat/completions`, model `deepseek-flash`.
3. Chọn **Thử kết nối** rồi gửi tin. API key chỉ lưu trong bộ nhớ phiên (`sessionStorage`) mặc định; tùy chọn nhớ khóa lưu tại `localStorage` là **không an toàn trên thiết bị dùng chung**. Không đặt khóa trong GitHub.
4. Các khả năng tìm kiếm web, đọc liên kết, PDF, microphone và kết xuất phụ thuộc API/ quyền truy cập/ CDN; lỗi được hiển thị rõ ràng, không giả lập kết quả.

## Chức năng

- Nhiều cuộc trò chuyện, tìm kiếm, tiêu đề tự động, đổi tên, xóa.
- Cây phiên bản hội thoại: sửa câu hỏi để tạo nhánh mới; tạo lại phản hồi thành nhánh song song; chuyển nhánh.
- Streaming SSE, dừng tạo, chế độ deep thinking tùy nhà cung cấp, nhật ký CVNSS4.0 (trạng thái công khai).
- Upload ảnh/text/PDF, kéo thả/dán, nhận dạng lời nói qua Web Speech API, tổng hợp giọng nói bằng speechSynthesis.
- Markdown + DOMPurify, syntax highlighting, KaTeX, Mermaid, ZIP import/export (không kèm API key).
- Chủ đề sáng/tối, giao diện Việt/English/中文; **đầu ra AI luôn được yêu cầu bằng tiếng Việt Unicode**.
- Tìm kiếm web qua công cụ tích hợp DeepSeek hoặc Tavily (tự nhập key cho các nhà cung cấp khác) và đọc URL qua Jina Reader (tùy chọn, chuyển URL tới bên thứ ba). Các chức năng này cần dịch vụ cho phép CORS.

## Cảnh báo quan trọng

- **Ứng dụng tĩnh không thể bảo vệ API key khỏi chính trình duyệt**. Dùng khóa giới hạn quyền và hạn mức, hoặc máy chủ proxy bảo mật cho triển khai công khai.
- Không gửi các khóa bí mật trong URL hay lịch sử export. ZIP chỉ chứa nội dung cuộc trò chuyện.
- Bật deep thinking **không bảo đảm** model hỗ trợ suy luận chuyên sâu; nhật ký CVNSS4.0 hiển thị là trạng thái xử lý có thể kiểm chứng, **không phải chain-of-thought ẩn**.
- CVNSS4.0 có ánh xạ nhiều-một, giải mã có thể nhập nhằng; luôn giữ câu trả lời Unicode gốc của AI, không tự chuyển ngược toàn bộ câu trả lời.
- Website đọc URL qua Jina Reader hoặc tìm kiếm Tavily nghĩa là nội dung truy vấn/URL rời khỏi trình duyệt và đi tới nhà cung cấp đó.

### Nguồn và giấy phép

BilaChat phát triển dựa trên tệp minh họa Bilabot được cung cấp và bộ `CVNSSConverter.VERSION = 5.0.0-audit-safe`. CVNSS4.0 do Trần Tư Bình và Kiều Trường Lâm đề xuất; tích hợp phần mềm của Long Ngo. MIT (xem LICENSE).

## Cấu hình DeepSeek và trang Transactions (16-11-2026)

**Không dùng** `https://platform.deepseek.com/transactions` làm API endpoint: đây là trang lịch sử giao dịch trong tài khoản DeepSeek, cần đăng nhập, không phải Chat Completions API.

- Quản lý khóa: https://platform.deepseek.com/api_keys
- Xem giao dịch và khoản nạp: https://platform.deepseek.com/transactions
- API chat: `https://api.deepseek.com/chat/completions`
- Model: `deepseek-flash` (tùy nhu cầu có thể dùng `deepseek-v4-pro`).
- Kiểm tra số dư (qua khóa của chính người dùng trong trình duyệt): `GET https://api.deepseek.com/user/balance` — BilaChat kiểm tra khi nhấn **Kiểm tra API & số dư**, nếu trình duyệt/nhà cung cấp cho phép CORS. Bước tiếp theo dùng một yêu cầu chat ngắn để xác minh model thực sự phản hồi (có thể tính phí nhỏ).
- Khi dùng DeepSeek, Bật Suy nghĩ sâu gửi `thinking:{type:"enabled"}`, tắt gửi `thinking:{type:"disabled"}`. Tìm kiếm sử dụng công cụ `deepseek_web_search`, đọc URL sử dụng `deepseek_read_url`.

### Khắc phục lỗi

| Lỗi | Ý nghĩa | Cách xử lý |
| --- | --- | --- |
| `Cannot access 'event' before initialization` | Lỗi biến trùng phạm vi trong SSE client trước bản vá 16-11-2026. | Cập nhật mã nguồn, tải lại trang bằng **Ctrl+Shift+R**. Kiểm thử ở `tests/engine.test.cjs`. |
| HTTP 401 | Khóa không còn hợp lệ | Tạo hoặc thay khóa trên DeepSeek Platform. |
| HTTP 402 | Tài khoản thiếu số dư API | Kiểm tra Transactions / nạp nếu cần; số dư chat web không đồng nghĩa số dư API. |
| HTTP 400 / 422 | Dữ liệu hoặc tham số chưa tương thích | Kiểm tra endpoint, model, thinking và công cụ. |
| HTTP 429 | Vượt giới hạn đồng thời | Giảm tần suất gửi yêu cầu. |
| `Failed to fetch`, CORS | Trình duyệt không nhận được phản hồi API trực tiếp | Kiểm tra mạng/DevTools; nếu do CORS, cần proxy có xác thực và bảo vệ khóa. |

**Bảo mật:** Nếu vô tình để lộ API key trong ảnh, logs hoặc bài đăng, hãy **thu hồi ngay và tạo khóa khác**, kể cả khi khóa còn hoạt động. Không gửi khóa qua chat. Khi mở lại Cài đặt, khóa luôn được che mặc định. Lịch sử ZIP không xuất khóa.

Nguồn: [DeepSeek Chat Completions](https://api-docs.deepseek.com/api/create-chat-completion/), [Thinking Mode](https://api-docs.deepseek.com/guides/thinking_mode/), [User Balance](https://api-docs.deepseek.com/api/get-user-balance/), [Web Tools](https://api-docs.deepseek.com/guides/web_tools/).


## Thinking → CVNSS4.0: reasoning riêng, câu trả lời Unicode (16/11/2026)

Theo [DeepSeek Thinking Mode](https://api-docs.deepseek.com/guides/thinking_mode/) và [Chat Completions](https://api-docs.deepseek.com/api/create-chat-completion/), nếu bật `thinking.type=enabled`, API có thể gửi các chunk `choices[0].delta.reasoning_content` khác với `choices[0].delta.content`.

- **Suy nghĩ DeepSeek · CVNSS4.0**: trình duyệt ghép toàn bộ các mảnh `reasoning_content` (bao gồm khi âm tiết tiếng Việt bị cắt giữa các mảnh), rồi chuyển bằng `CVNSSConverter.fromCqn(text.normalize('NFC')).cvss`. Dữ liệu CVNSS hiển thị dần, tối đa 120.000 ký tự để tránh tràn bộ nhớ. Không lưu nguyên bản reasoning tiếng Việt vào lịch sử; chỉ lưu kết quả mã hóa CVNSS.
- **Nhật ký BilaChat · CVNSS4.0**: thông báo có thật về yêu cầu, nhận dữ liệu, gọi công cụ web — được tạo từ trạng thái ứng dụng, **không phải reasoning của DeepSeek**. Luôn gắn nhãn riêng.
- **Câu trả lời**: chỉ lấy `choices[0].delta.content`, giữ nguyên nội dung Unicode tiếng Việt và chuẩn hóa NFC. Không cố giải mã CVNSS ngược về tiếng Việt, vì codec có ánh xạ nhiều-một.
- Nếu API không trả về `reasoning_content`, ứng dụng ghi đúng: **“API không trả về reasoning_content trong lượt này.”** Không mô phỏng suy luận và không trộn nhật ký thao tác với suy nghĩ của model.
- Codec CVNSS4.0 chỉ định nghĩa biến đổi cho tiếng Việt; cụm tiếng Anh, mã lập trình và ký hiệu ngoài miền mã hóa sẽ được giữ nguyên. Lời nhắc có thể khuyến khích reasoning tiếng Việt, nhưng không bảo đảm mô hình sẽ luôn dùng tiếng Việt.
- Chế độ **Suy nghĩ sâu** được bật mặc định khi chạy với cấu hình DeepSeek; người dùng vẫn có thể tắt bằng nút ở ô nhập.

### Kiểm thử

`tests/engine.test.cjs` mô phỏng DeepSeek streaming có các trường `reasoning_content`, `content`, `server_tool_event`, và `annotations` để xác minh mã hóa reasoning, Unicode answer, trích dẫn, trường hợp trả về JSON và lưu lịch sử. `tests/core.test.cjs` kiểm tra chuẩn hóa nhánh chat và codec.

**Bản chất:** hiển thị `reasoning_content` có thể lấy được từ API **không** có nghĩa BilaChat có thể đọc được mọi suy nghĩ nội bộ không được model tiết lộ. CVNSS4.0 là phép biểu diễn; không chứng minh AI thực hiện suy luận bằng CVNSS4.0.
