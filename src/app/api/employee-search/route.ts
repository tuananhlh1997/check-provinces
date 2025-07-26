import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';

export async function POST(request: NextRequest) {
    try {
        const { personId } = await request.json();

        if (!personId) {
            return NextResponse.json(
                { success: false, error: 'Vui lòng nhập mã nhân viên' },
                { status: 400 }
            );
        }

        const pool = await getConnection();
        
        const result = await pool.request()
            .input('PersonID', personId)
            .query(`
                SELECT 
                    Person_ID,
                    Person_Name,
                    Staying_Address
                FROM View_Data_Person 
                WHERE Person_ID = @PersonID
            `);

        if (result.recordset.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Không tìm thấy nhân viên với mã này' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: result.recordset[0]
        });

    } catch (error) {
        console.error('Error searching employee:', error);
        return NextResponse.json(
            { success: false, error: 'Lỗi server khi tìm kiếm nhân viên' },
            { status: 500 }
        );
    }
}
