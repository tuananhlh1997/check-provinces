import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import sql from 'mssql';

export async function POST(request: NextRequest) {
  try {
    const { date } = await request.json();
    
    if (!date || typeof date !== 'string') {
      return NextResponse.json(
        { error: 'Ngày không hợp lệ' },
        { status: 400 }
      );
    }

    const connection = await getConnection();
    const result = await connection.request()
      .input('date', sql.Date, date)
      .query(`
        SELECT Person_ID, Person_Name, Staying_Address 
        FROM dbo.View_Data_Person 
        WHERE Date_Come_In = @date
      `);
    
    return NextResponse.json({
      success: true,
      data: result.recordset
    });
    
  } catch (error) {
    console.error('Error fetching employees:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Không thể lấy danh sách nhân viên',
      data: []
    });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Employee API is running',
    endpoint: 'POST /api/employees',
    example: {
      date: '2025-07-25'
    }
  });
}
