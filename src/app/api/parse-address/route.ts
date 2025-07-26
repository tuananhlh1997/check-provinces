import { NextRequest, NextResponse } from 'next/server';
import { parseAddress } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();
    
    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        { error: 'Địa chỉ không hợp lệ' },
        { status: 400 }
      );
    }

    // Gọi stored procedure để parse địa chỉ
    const result = await parseAddress(address);
    
    return NextResponse.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Error parsing address:', error);
    
    // Fallback response nếu database không khả dụng
    const { address: originalAddress } = await request.json().catch(() => ({ address: '' }));
    
    return NextResponse.json({
      success: false,
      error: 'Không thể kết nối đến cơ sở dữ liệu hoặc có lỗi xảy ra',
      data: {
        Original_Address: originalAddress || '',
        Address_Part: '',
        Original_Ward: '',
        Original_District: '',
        Original_City: '',
        Province_ID_NEW: 0,
        Province_Name_NEW: '',
        Ward_ID_NEW: 0,
        Ward_Name_NEW: '',
        New_Address: 'Không thể kết nối đến cơ sở dữ liệu',
        Parse_Success_Level: 0
      }
    });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Address Parser API is running',
    endpoint: 'POST /api/parse-address',
    database: {
      server: '192.168.60.13',
      database: 'HRIS_TX2',
      procedure: 'SP_ParseAddressToNew'
    },
    example: {
      address: 'Số Nhà 190, Tổ 13, Phường Long Châu, TP. Vĩnh Long, Tỉnh Vĩnh Long'
    }
  });
}
