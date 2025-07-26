# Cấu hình Server Backend

## Yêu cầu
Ứng dụng này cần kết nối với server backend để xử lý địa chỉ sử dụng stored procedure SQL.

## Cấu hình

### 1. Cập nhật URL Server
Chỉnh sửa file `.env.local`:
```
ADDRESS_PARSER_SERVER_URL=http://your-server-url:port/api/parse-address
```

### 2. API Contract
Server backend cần cung cấp endpoint:

**Endpoint:** `POST /api/parse-address`

**Request Body:**
```json
{
  "StayingAddress": "Số Nhà 190, Tổ 13, Phường Long Châu, TP. Vĩnh Long, Tỉnh Vĩnh Long"
}
```

**Response:**
```json
{
  "Original_Address": "Số Nhà 190, Tổ 13, Phường Long Châu, TP. Vĩnh Long, Tỉnh Vĩnh Long",
  "Address_Part": "Số Nhà 190 - Tổ 13",
  "Original_Ward": "Phường Long Châu",
  "Original_District": "TP. Vĩnh Long",
  "Original_City": "Tỉnh Vĩnh Long",
  "Province_ID_NEW": 92,
  "Province_Name_NEW": "Tỉnh Vĩnh Long",
  "Ward_ID_NEW": 8,
  "Ward_Name_NEW": "Phường Long Châu",
  "New_Address": "Số Nhà 190 - Tổ 13, Phường Long Châu, Tỉnh Vĩnh Long",
  "Parse_Success_Level": 1
}
```

### 3. Fallback Behavior
Nếu server không khả dụng, ứng dụng sẽ trả về response mặc định với thông báo "Server không khả dụng".

## Chạy ứng dụng

1. Cài đặt dependencies:
```bash
npm install
```

2. Chạy development server:
```bash
npm run dev
```

3. Mở trình duyệt tại: `http://localhost:3000`

## Test API
Bạn có thể test API bằng cách truy cập: `http://localhost:3000/api/parse-address` (GET) để xem thông tin cấu hình.
