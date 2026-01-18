Tổng quan API
Base URLs
https://pgapi-sandbox.sepay.vn
Xác thực API
Tất cả các API của SePay đều sử dụng Basic Authentication để xác thực.

Headers
Authorization: Basic base64(merchant_id:secret_key) 
Content-Type: application/json
Mã lỗi chung
Mã lỗi	Mô tả	Giải pháp
200	
Thành công
Request được xử lý thành công
—
400	
Bad Request
Dữ liệu request không hợp lệ
Kiểm tra lại các tham số
401	
Unauthorized
Xác thực thất bại
Kiểm tra lại merchant_id và secret_key
403	
Forbidden
Không có quyền truy cập API này
Xác nhận quyền truy cập/whitelist nếu cần
404	
Not Found
Không tìm thấy tài nguyên yêu cầu
Kiểm tra URL/path hoặc id
422	
Unprocessable Entity
Dữ liệu hợp lệ nhưng không thể xử lý (validation errors)
Sửa các lỗi validation theo thông báo
429	
Too Many Requests
Vượt quá giới hạn rate limit
Giảm tần suất, áp dụng retry/backoff
500	
Internal Server Error
Lỗi server
Thử lại sau; liên hệ SePay để được hỗ trợ
Phân trang
Các API trả về danh sách đều hỗ trợ phân trang:

Tên	     | Loại    | Bắt buộc	    | Mô tả
per_page | integer | Không bắt buộc	| Số lượng kết quả mỗi trang (mặc định: 20, tối đa: 100)
page     | integer | Không bắt buộc	| Trang hiện tại (mặc định: 1)

Định dạng trả về

{
  "data": "[...]",
  "meta": {
    "per_page": 20,
    "total": 100,
    "has_more": false,
    "current_page": 1,
    "page_count": 5
  }
}
