import sql from 'mssql';

const config: sql.config = {
  server: process.env.DB_SERVER || '192.168.60.13',
  database: process.env.DB_DATABASE || 'HRIS_TX2',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'Nhansu2018',
  options: {
    encrypt: false, // Tắt mã hóa cho môi trường local
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

let pool: sql.ConnectionPool | null = null;

export async function getConnection(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = new sql.ConnectionPool(config);
    await pool.connect();
  }
  return pool;
}

export async function executeStoredProcedure(
  procedureName: string,
  parameters: { [key: string]: unknown }
): Promise<unknown> {
  try {
    const connection = await getConnection();
    const request = connection.request();
    
    // Thêm các parameters vào request
    Object.keys(parameters).forEach(key => {
      request.input(key, parameters[key]);
    });

    const result = await request.execute(procedureName);
    return result.recordset[0]; // Trả về bản ghi đầu tiên
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}

export async function parseAddress(stayingAddress: string): Promise<unknown> {
  try {
    const result = await executeStoredProcedure('SP_ParseAddressToNew', {
      StayingAddress: stayingAddress
    });
    
    return result;
  } catch (error) {
    console.error('Error parsing address:', error);
    throw error;
  }
}

// Đóng kết nối khi ứng dụng kết thúc
export async function closeConnection(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
  }
}

// Xử lý graceful shutdown
process.on('SIGINT', async () => {
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeConnection();
  process.exit(0);
});
