# Address Parser App - Agent Configuration

## Các lệnh thường dùng

### Build & Development
```bash
npm run dev          # Chạy development server
npm run build        # Build production
npm run start        # Chạy production server
npm run lint         # Kiểm tra ESLint
```

### Database
- Server: 192.168.60.13
- Database: HRIS_TX2
- User: sa
- Password: Nhansu2018
- Stored Procedures:
  - `SP_ParseAddressToNew` - Phân tích địa chỉ
- Views:
  - `View_Data_Person` - Thông tin nhân viên

## Cấu trúc ứng dụng

### API Endpoints
- `GET/POST /api/parse-address` - Phân tích địa chỉ thủ công
- `GET/POST /api/employees` - Lấy danh sách nhân viên theo ngày

### Components
- `ClientAddressParser.tsx` - Component chính với 2 tabs:
  - Tab "Nhập thủ công": Nhập địa chỉ manual
  - Tab "Nhân viên theo ngày": Lấy từ database theo ngày

### Database Connection
- File: `src/lib/database.ts`
- Sử dụng `mssql` package
- Connection pooling enabled
- Graceful shutdown handling

## Code Style
- TypeScript strict mode
- ESLint với Next.js rules
- Tailwind CSS cho styling
- Responsive design (mobile-first)
- Màu sắc tối giản (gray theme)

## Tính năng chính

### 1. Phân tích địa chỉ thủ công
- Nhập nhiều địa chỉ (mỗi dòng 1 địa chỉ)
- Gọi stored procedure để chuẩn hóa
- Hiển thị kết quả với độ chính xác
- Copy to clipboard
- Export Excel

### 2. Phân tích địa chỉ nhân viên
- Chọn ngày làm việc
- Lấy danh sách nhân viên từ View_Data_Person
- Xử lý từng địa chỉ hoặc tất cả
- Export Excel với thông tin nhân viên

## Environment Variables
```
DB_SERVER=192.168.60.13
DB_DATABASE=HRIS_TX2
DB_USER=sa
DB_PASSWORD=Nhansu2018
```

## Tech Stack
- Next.js 15.4.4
- React 19.1.0
- TypeScript 5
- Tailwind CSS 3.4.0
- mssql 11.0.1
- axios 1.11.0
- xlsx 0.18.5
