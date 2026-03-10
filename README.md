# MetaX - Ads Checker Tool

Công cụ tự động quét, kiểm tra trạng thái, giới hạn, số dư, chi tiêu cho tài khoản quảng cáo Meta (Facebook).

> Author: [T.ME/hieunguyen2907](https://t.me/hieunguyen2907)

---

## Mục lục

* [Tính năng](#tính-năng)
* [Yêu cầu](#yêu-cầu)
* [Cài đặt](#cài-đặt)
* [Cấu hình](#cấu-hình)
* [Cách sử dụng](#cách-sử-dụng)
* [Kết quả đầu ra](#kết-quả-đầu-ra)
* [Kiến trúc mã nguồn](#kiến-trúc-mã-nguồn)
* [Lưu ý](#lưu-ý)

---

## Tính năng

| Tính năng | Mô tả |
| :--- | :--- |
| **Check Tài Khoản (AD)** | Quét trạng thái tài khoản quảng cáo (Active, Disabled, Unsettled...) |
| **Check Limit & Tiền Tệ** | Quét giới hạn chi tiêu (Spend Cap), ngưỡng (Threshold), Balance và lượng tiền đã tiêu (Spend). Hỗ trợ quy đổi USD. |
| **Check Business (BM)** | Quét thông tin Business Manager (BM), trạng thái xác minh, số lượng TKQC và Page. |
| **Check Page** | Quét danh sách Page, chuyên mục, lượt theo dõi (Followers) và lượt thích (Likes). |
| **Check Campaign** | Quét chi tiết các chiến dịch (Campaign) về ngân sách ngày/trọn đời và trạng thái (Active/Paused). |
| **Báo cáo Mix** | Tóm tắt báo cáo nhanh tài khoản live, nợ (debt), không giới hạn (No Limit) và tổng chi tiêu quy đổi ra USD. |
| **Xuất dữ liệu** | Trích xuất toàn bộ dữ liệu tài khoản quảng cáo ra tệp CSV để dễ dàng quản lý (Export). |
| **Auto Extract Token** | Tự động lấy token từ trình duyệt khi ấn "Lấy Token" (bắt buộc phải qua tab Ads Manager/BM). |

---

## Yêu cầu

- Trình duyệt **Google Chrome**, **Microsoft Edge**, hoặc **Cốc Cốc**.
- Cần có tài khoản quảng cáo Facebook (Ads Manager hoặc Business Manager).
- Tệp extension không giải nén (Source code).

---

## Cài đặt

1. Tải thư mục chứa mã nguồn (Source Code) của tiện ích này về máy tính.
2. Mở trình duyệt Chrome/Edge/Cốc Cốc.
3. Nhập từ khóa truy cập vào trang quản lý tiện ích: `chrome://extensions/`
4. Ở góc phải màn hình, bật **Chế độ dành cho nhà phát triển** (Developer mode).
5. Cuối cùng, nhấn vào **Tải tiện ích đã giải nén** (Load unpacked) và trỏ đến thư mục chứa mã nguồn MetaX.

---

## Cấu hình

*(Không bắt buộc, chỉ dành cho CLI)*
Nếu cần mở CLI để thấy LOGO ASCII đẹp trên Terminal (Node.js required):
1. Yêu cầu đã cài **Node.js** trên thiết bị.
2. Mở terminal vào thư mục tiện ích.
3. Chạy lệnh: `node cli.js`

---

## Cách sử dụng

Công cụ hiện tại hoạt động theo giao diện Extension trên Chrome. Cách sử dụng như sau:

1. **Hiển thị giao diện**:
   - Nhấn vào biểu tượng (Icon) của extension MetaX trên thanh công cụ của trình duyệt. 
   - Lúc này, nó sẽ tự động nhận diện và nếu bạn không có token, nó sẽ mở ra một cửa sổ popup quản lý nhỏ hoặc pop ra trang web mới theo cấu hình.
   
2. **Kích hoạt kết nối (Lấy Token API)**:
   - Trong giao diện Đăng Nhập, bạn có thể nhập Token API `EAAG...` (Token Business Manager) của bạn vào ô Access Token.
   - **HOẶC** nhấn nút xanh **Lấy Token** (Khuyến nghị mở sẵn một tab quản trị BM của Facebook và đăng nhập từ trước để tính năng tự lấy token diễn ra thành công). 
   - Hoàn tất kết nối nhấn **Kết Kết**.

3. **Check Accounts (Kiểm tra)**:
   - Giao diện gồm các **TAB (AD, BM, PAGE, CAMP)**.
   - **Tab AD**: Nơi chứa toàn bộ TKQC. Bạn nhấn nút Reload (Vòng quay <i class="fas fa-sync-alt"></i>) để load danh sách tài khoản, và dùng nút Tiền tệ <i class="fas fa-dollar-sign"></i> để chuyển đổi (Quy USD). Ấn vào Icon Load cạnh ID để check limit chi tiết của TK cụ thể.
   - **Tab BM / PAGE / CAMP**: Lặp lại thao tác tương tự để kiểm tra thông tin Business, Trang và Chiến dịch.
   - Tính năng lọc / Mix (nút xanh) / Export (nút tải xuống) nằm ngay ở Toolbar bên phải.

---

## Kết quả đầu ra

Dữ liệu sẽ được xuất nhanh chóng lên giao diện Web UI dạng bảng Table. 
Ngoài ra có thể bấm `Export` để xuất ra file CSV mở bằng Excel. File sẽ mang mẫu tên: `MetaX_YYYY-MM-DD.csv`.

---

## Kiến trúc mã nguồn

| File/Thư mục | Chức năng (Ý Nghĩa) |
| :--- | :--- |
| `manifest.json` | Cấu hình cho tiện ích Extension V3, cung cấp quyền vào host và background. |
| `popup.html` | Giao diện hiển thị gốc (UI) của công cụ khi nhấn mở Popup. |
| `popup.css` | Tệp Style cho app, tái cấu trúc bảng với màu sắc giao diện "sMeta". |
| `popup.js` | Core Logic của Ext (Hỗ trợ gọi Graph API từ Facebook, xử lý Token, Pagination, Export...). |
| `background.js` | Service chạy ngầm đằng sau trình duyệt, hỗ trợ pop-out Windows và mở link tự động. |
| `package.json` / `cli.js` | Cấu hình node bin cho những ai muốn gọi extension thông qua nodejs terminal. |

---

## Lưu ý

- **QUAN TRỌNG**: Nếu nút **"Lấy Token"** không làm việc, hãy chắc chắn bạn đã đăng nhập Facebook và đang mở cửa sổ **Cài đặt cho doanh nghiệp** (Business Settings).
- Tiện ích này lấy thông tin thông qua **Graph API v19.0** của Meta.
- Token được lưu trữ bằng `chrome.storage.local` ở phía bộ nhớ Local của chính trình duyệt của bạn (Bảo mật 100%).
- Tiện ích này **KHÔNG** hề gửi Token hoặc cookies của bạn ra bất cứ máy chủ trung gian (Server ngoài) nào khác.
