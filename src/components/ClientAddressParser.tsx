'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

interface ParsedAddress {
    Original_Address: string;
    Address_Part: string;
    Original_Ward: string;
    Original_District: string;
    Original_City: string;
    Province_ID_NEW: number;
    Province_Name_NEW: string;
    Ward_ID_NEW: number;
    Ward_Name_NEW: string;
    New_Address: string;
    Parse_Success_Level: number;
}

interface Employee {
    Person_ID: number;
    Person_Name: string;
    Staying_Address: string;
}

interface EmployeeWithParsedAddress extends Employee {
    parsedAddress?: ParsedAddress;
    isProcessing?: boolean;
}

export default function ClientAddressParser() {
    const [activeTab, setActiveTab] = useState<'manual' | 'employee'>('manual');
    
    // Manual input states
    const [inputAddress, setInputAddress] = useState('');
    const [results, setResults] = useState<ParsedAddress[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    
    // Employee states
    const [searchMode, setSearchMode] = useState<'date' | 'id'>('date');
    const [selectedDate, setSelectedDate] = useState('');
    const [employeeId, setEmployeeId] = useState('');
    const [employees, setEmployees] = useState<EmployeeWithParsedAddress[]>([]);
    const [employeeLoading, setEmployeeLoading] = useState(false);
    const [employeeError, setEmployeeError] = useState('');
    
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const today = new Date().toISOString().split('T')[0];
        setSelectedDate(today);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputAddress.trim()) {
            setError('Vui lòng nhập địa chỉ cần phân tích');
            return;
        }

        const addresses = inputAddress.trim().split('\n').filter(addr => addr.trim());
        setLoading(true);
        setError('');
        setResults([]);

        try {
            const processedResults: ParsedAddress[] = [];
            for (const address of addresses) {
                const response = await axios.post('/api/parse-address', {
                    address: address.trim()
                });
                if (response.data.success) {
                    processedResults.push(response.data.data);
                }
            }
            setResults(processedResults);
            if (processedResults.length === 0) {
                setError('Không thể phân tích các địa chỉ');
            }
        } catch (err: unknown) {
            const error = err as { response?: { data?: { error?: string } } };
            setError(error.response?.data?.error || 'Lỗi kết nối đến server');
        } finally {
            setLoading(false);
        }
    };

    const clearAll = () => {
        setInputAddress('');
        setResults([]);
        setError('');
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            if (file.name.endsWith('.txt')) {
                setInputAddress(content);
            } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                try {
                    const data = new Uint8Array(content as unknown as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    
                    const addresses = jsonData
                        .flat()
                        .filter((cell: unknown) => typeof cell === 'string' && cell.trim().length > 0)
                        .join('\n');
                    
                    setInputAddress(addresses);
                } catch (error) {
                    setError('Không thể đọc file Excel. Vui lòng kiểm tra định dạng file.');
                    console.error('Excel read error:', error);
                }
            }
        };

        if (file.name.endsWith('.txt')) {
            reader.readAsText(file);
        } else {
            reader.readAsArrayBuffer(file);
        }
        event.target.value = '';
    };

    const copyToClipboard = async (text: string, index: number) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedIndex(index);
            setTimeout(() => setCopiedIndex(null), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    // Employee functions
    const fetchEmployees = async () => {
        if (searchMode === 'date' && !selectedDate) {
            setEmployeeError('Vui lòng chọn ngày');
            return;
        }
        
        if (searchMode === 'id' && !employeeId.trim()) {
            setEmployeeError('Vui lòng nhập mã nhân viên');
            return;
        }

        setEmployeeLoading(true);
        setEmployeeError('');
        setEmployees([]);

        try {
            let response;
            
            if (searchMode === 'date') {
                response = await axios.post('/api/employees', {
                    date: selectedDate
                });
                
                if (response.data.success) {
                    setEmployees(response.data.data.map((emp: Employee) => ({
                        ...emp,
                        parsedAddress: undefined,
                        isProcessing: false
                    })));
                } else {
                    setEmployeeError('Không tìm thấy nhân viên nào');
                }
            } else {
                response = await axios.post('/api/employee-search', {
                    personId: employeeId.trim()
                });
                
                if (response.data.success) {
                    setEmployees([{
                        ...response.data.data,
                        parsedAddress: undefined,
                        isProcessing: false
                    }]);
                } else {
                    setEmployeeError(response.data.error || 'Không tìm thấy nhân viên');
                }
            }
        } catch (err: unknown) {
            const error = err as { response?: { data?: { error?: string } } };
            setEmployeeError(error.response?.data?.error || 'Lỗi kết nối đến server');
        } finally {
            setEmployeeLoading(false);
        }
    };

    const cleanEmployeeData = () => {
        setEmployees(prev => prev.map(emp => ({
            ...emp,
            parsedAddress: undefined,
            isProcessing: false
        })));
    };

    const parseEmployeeAddress = async (employeeIndex: number) => {
        const employee = employees[employeeIndex];
        if (!employee.Staying_Address || employee.isProcessing) return;

        setEmployees(prev => prev.map((emp, idx) => 
            idx === employeeIndex ? { ...emp, isProcessing: true } : emp
        ));

        try {
            const response = await axios.post('/api/parse-address', {
                address: employee.Staying_Address
            });

            if (response.data.success) {
                setEmployees(prev => prev.map((emp, idx) => 
                    idx === employeeIndex ? { 
                        ...emp, 
                        parsedAddress: response.data.data,
                        isProcessing: false 
                    } : emp
                ));
            }
        } catch (error) {
            console.error('Error parsing employee address:', error);
            setEmployees(prev => prev.map((emp, idx) => 
                idx === employeeIndex ? { ...emp, isProcessing: false } : emp
            ));
        }
    };

    const parseAllEmployeeAddresses = async () => {
        for (let i = 0; i < employees.length; i++) {
            if (!employees[i].parsedAddress) {
                await parseEmployeeAddress(i);
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    };

    const exportToExcel = () => {
        const dataToExport = activeTab === 'manual' ? results : employees.filter(emp => emp.parsedAddress);
        if (dataToExport.length === 0) return;

        let exportData;
        
        if (activeTab === 'manual') {
            exportData = results.map((result, index) => ({
                'STT': index + 1,
                'Địa chỉ gốc': result.Original_Address || '',
                'Địa chỉ chuẩn hóa': result.New_Address || '',
                'Phường/Xã': result.Ward_Name_NEW || '',
                'Quận/Huyện': result.Original_District || '',
                'Tỉnh/Thành phố': result.Province_Name_NEW || '',
                'Mức độ thành công': result.Parse_Success_Level
            }));
        } else {
            exportData = employees
                .filter(emp => emp.parsedAddress)
                .map((emp, index) => ({
                    'STT': index + 1,
                    'Mã NV': emp.Person_ID,
                    'Tên nhân viên': emp.Person_Name,
                    'Địa chỉ gốc': emp.Staying_Address || '',
                    'Địa chỉ chuẩn hóa': emp.parsedAddress?.New_Address || '',
                    'Phường/Xã': emp.parsedAddress?.Ward_Name_NEW || '',
                    'Quận/Huyện': emp.parsedAddress?.Original_District || '',
                    'Tỉnh/Thành phố': emp.parsedAddress?.Province_Name_NEW || '',
                    'Mức độ thành công': emp.parsedAddress?.Parse_Success_Level || 0
                }));
        }

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, activeTab === 'manual' ? 'Danh sách địa chỉ' : 'Nhân viên');
        
        const fileName = `${activeTab === 'manual' ? 'dia_chi_chuan_hoa' : 'nhan_vien_dia_chi'}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    if (!isMounted) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-4 py-3">
                    <div className="flex items-center justify-center">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-lg font-semibold text-gray-900">Address Parser</h1>
                                <p className="text-xs text-gray-600">Hệ thống phân tích địa chỉ Việt Nam</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-4 py-4">
                {/* Tabs */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
                    <nav className="flex">
                        <button
                            onClick={() => setActiveTab('manual')}
                            className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 ${
                                activeTab === 'manual'
                                    ? 'border-gray-700 text-gray-900 bg-gray-50'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Nhập thủ công
                        </button>
                        <button
                            onClick={() => setActiveTab('employee')}
                            className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 ${
                                activeTab === 'employee'
                                    ? 'border-gray-700 text-gray-900 bg-gray-50'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Quản lý nhân viên
                        </button>
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="h-[calc(100vh-200px)]">
                    {activeTab === 'manual' ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
                            {/* Input Section */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
                                <div className="border-b border-gray-200 px-4 py-2">
                                    <h2 className="text-sm font-medium text-gray-900">Nhập địa chỉ</h2>
                                </div>

                                <div className="flex-1 p-4 flex flex-col">
                                    <form onSubmit={handleSubmit} className="flex flex-col h-full">
                                        {/* File Upload */}
                                        <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-medium text-gray-700">Import từ file</span>
                                                <span className="text-xs text-gray-500">.txt, .xlsx, .xls</span>
                                            </div>
                                            <input
                                                type="file"
                                                accept=".txt,.xlsx,.xls"
                                                onChange={handleFileUpload}
                                                className="block w-full text-xs text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-gray-700 file:text-white hover:file:bg-gray-800 file:cursor-pointer cursor-pointer"
                                                disabled={loading}
                                            />
                                        </div>

                                        {/* Textarea */}
                                        <div className="flex-1 flex flex-col">
                                            <label className="block text-xs font-medium text-gray-700 mb-2">
                                                Danh sách địa chỉ (mỗi dòng một địa chỉ)
                                            </label>
                                            <div className="relative flex-1">
                                                <textarea
                                                    value={inputAddress}
                                                    onChange={(e) => setInputAddress(e.target.value)}
                                                    placeholder="Ví dụ:&#10;123 Nguyễn Huệ, Quận 1, TP.HCM&#10;456 Lê Lợi, Quận Hoàn Kiếm, Hà Nội"
                                                    className="w-full h-full px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500 resize-none"
                                                    disabled={loading}
                                                />
                                                <div className="absolute bottom-2 right-2 text-xs text-gray-400 bg-white px-1">
                                                    {inputAddress.trim().split('\n').filter(addr => addr.trim()).length} địa chỉ
                                                </div>
                                            </div>
                                        </div>

                                        {/* Buttons */}
                                        <div className="flex space-x-2 mt-3">
                                            <button
                                                type="submit"
                                                disabled={loading || !inputAddress.trim()}
                                                className="flex-1 bg-gray-700 hover:bg-gray-800 disabled:bg-gray-400 text-white text-xs font-medium py-2 px-4 rounded transition-colors duration-200 flex items-center justify-center space-x-2"
                                            >
                                                {loading ? (
                                                    <>
                                                        <div className="animate-spin w-3 h-3 border border-white/30 border-t-white rounded-full"></div>
                                                        <span>Đang xử lý...</span>
                                                    </>
                                                ) : (
                                                    <span>Phân tích</span>
                                                )}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={clearAll}
                                                disabled={loading}
                                                className="px-4 py-2 text-xs font-medium text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors duration-200"
                                            >
                                                Xóa
                                            </button>
                                        </div>

                                        {error && (
                                            <div className="mt-3 bg-red-50 border border-red-200 rounded p-3">
                                                <p className="text-xs text-red-700">{error}</p>
                                            </div>
                                        )}
                                    </form>
                                </div>
                            </div>

                            {/* Results Section */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
                                <div className="border-b border-gray-200 px-4 py-2 flex items-center justify-between">
                                    <h2 className="text-sm font-medium text-gray-900">
                                        Kết quả {results.length > 0 && `(${results.length})`}
                                    </h2>
                                    {results.length > 0 && (
                                        <button
                                            onClick={exportToExcel}
                                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors duration-200"
                                        >
                                            Excel
                                        </button>
                                    )}
                                </div>

                                <div className="flex-1 overflow-hidden p-4">
                                    {results.length > 0 ? (
                                        <div className="space-y-3 h-full overflow-y-auto">
                                            {results.map((result, index) => (
                                                <div key={index} className="border border-gray-200 rounded p-3 hover:bg-gray-50 transition-colors">
                                                    <div className="flex items-start space-x-3">
                                                        <div className="flex-shrink-0">
                                                            <div className="w-6 h-6 bg-gray-700 rounded text-white text-xs font-medium flex items-center justify-center">
                                                                {index + 1}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex-1 space-y-2">
                                                            {/* Standardized Address */}
                                                            <div className="bg-green-50 border border-green-200 rounded p-2">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <span className="text-xs font-medium text-green-800">Địa chỉ chuẩn hóa</span>
                                                                    <button
                                                                        onClick={() => copyToClipboard(result.New_Address || '', index)}
                                                                        className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-0.5 rounded transition-colors"
                                                                    >
                                                                        {copiedIndex === index ? 'Đã copy' : 'Copy'}
                                                                    </button>
                                                                </div>
                                                                <p className="text-xs text-green-900 font-medium">
                                                                    {result.New_Address || 'Không xác định'}
                                                                </p>
                                                            </div>

                                                            {/* Original Address */}
                                                            <div className="bg-gray-50 border border-gray-200 rounded p-2">
                                                                <span className="text-xs font-medium text-gray-600">Địa chỉ gốc</span>
                                                                <p className="text-xs text-gray-700 mt-0.5">
                                                                    {result.Original_Address || 'Không xác định'}
                                                                </p>
                                                            </div>

                                                            {/* Success Level */}
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center space-x-2">
                                                                    <span className="text-xs text-gray-600">Độ chính xác:</span>
                                                                    <div className="flex space-x-0.5">
                                                                        {[1, 2, 3].map((level) => (
                                                                            <div
                                                                                key={level}
                                                                                className={`w-1.5 h-1.5 rounded-full ${
                                                                                    level <= (result.Parse_Success_Level || 0)
                                                                                        ? 'bg-green-500'
                                                                                        : 'bg-gray-300'
                                                                                }`}
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                {result.Province_Name_NEW && (
                                                                    <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">
                                                                        {result.Province_Name_NEW.replace('Tỉnh ', '').replace('Thành phố ', '')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-center">
                                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                                                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                            </div>
                                            <h3 className="text-sm font-medium text-gray-700 mb-1">Chưa có kết quả</h3>
                                            <p className="text-xs text-gray-500">Nhập địa chỉ và nhấn "Phân tích" để bắt đầu</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 h-full flex flex-col">
                            {/* Search Section */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-shrink-0">
                                <div className="border-b border-gray-200 px-4 py-2">
                                    <h2 className="text-sm font-medium text-gray-900">Tìm kiếm nhân viên</h2>
                                </div>
                                
                                <div className="p-4">
                                    {/* Search Mode Toggle */}
                                    <div className="mb-4">
                                        <label className="block text-xs font-medium text-gray-700 mb-2">Phương thức tìm kiếm</label>
                                        <div className="flex space-x-4">
                                            <label className="flex items-center">
                                                <input
                                                    type="radio"
                                                    value="date"
                                                    checked={searchMode === 'date'}
                                                    onChange={(e) => setSearchMode(e.target.value as 'date' | 'id')}
                                                    className="mr-2 text-gray-600 focus:ring-gray-500"
                                                    disabled={employeeLoading}
                                                />
                                                <span className="text-xs text-gray-700">Theo ngày làm việc</span>
                                            </label>
                                            <label className="flex items-center">
                                                <input
                                                    type="radio"
                                                    value="id"
                                                    checked={searchMode === 'id'}
                                                    onChange={(e) => setSearchMode(e.target.value as 'date' | 'id')}
                                                    className="mr-2 text-gray-600 focus:ring-gray-500"
                                                    disabled={employeeLoading}
                                                />
                                                <span className="text-xs text-gray-700">Theo mã nhân viên</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                        <div>
                                            {searchMode === 'date' ? (
                                                <>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Ngày làm việc</label>
                                                    <input
                                                        type="date"
                                                        value={selectedDate}
                                                        onChange={(e) => setSelectedDate(e.target.value)}
                                                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                                                        disabled={employeeLoading}
                                                    />
                                                </>
                                            ) : (
                                                <>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Mã nhân viên</label>
                                                    <input
                                                        type="text"
                                                        value={employeeId}
                                                        onChange={(e) => setEmployeeId(e.target.value)}
                                                        placeholder="Nhập mã nhân viên..."
                                                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                                                        disabled={employeeLoading}
                                                    />
                                                </>
                                            )}
                                        </div>
                                        <div className="flex items-end space-x-2">
                                            <button
                                                onClick={fetchEmployees}
                                                disabled={employeeLoading || (searchMode === 'date' ? !selectedDate : !employeeId.trim())}
                                                className="bg-gray-700 hover:bg-gray-800 disabled:bg-gray-400 text-white text-xs font-medium py-2 px-4 rounded transition-colors duration-200 flex items-center space-x-2"
                                            >
                                                {employeeLoading ? (
                                                    <>
                                                        <div className="animate-spin w-3 h-3 border border-white/30 border-t-white rounded-full"></div>
                                                        <span>Đang tải...</span>
                                                    </>
                                                ) : (
                                                    <span>Tìm kiếm</span>
                                                )}
                                            </button>
                                            {employees.length > 0 && (
                                                <button
                                                    onClick={cleanEmployeeData}
                                                    disabled={employeeLoading}
                                                    className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-xs font-medium py-2 px-4 rounded transition-colors duration-200"
                                                >
                                                    Xóa kết quả
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {employeeError && (
                                        <div className="mt-3 bg-red-50 border border-red-200 rounded p-3">
                                            <p className="text-xs text-red-700">{employeeError}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Employee List */}
                            {employees.length > 0 && (
                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
                                    <div className="border-b border-gray-200 px-4 py-2 flex items-center justify-between">
                                        <h2 className="text-sm font-medium text-gray-900">
                                            {searchMode === 'date' ? `Nhân viên (${employees.length})` : 'Thông tin nhân viên'}
                                        </h2>
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={parseAllEmployeeAddresses}
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors duration-200"
                                            >
                                                Xử lý tất cả
                                            </button>
                                            {employees.some(emp => emp.parsedAddress) && (
                                                <button
                                                    onClick={exportToExcel}
                                                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors duration-200"
                                                >
                                                    Excel
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-hidden p-4">
                                        <div className="space-y-3 h-full overflow-y-auto">
                                            {employees.map((employee, index) => (
                                                <div key={employee.Person_ID} className="border border-gray-200 rounded p-3">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div>
                                                            <h3 className="text-sm font-medium text-gray-900">{employee.Person_Name}</h3>
                                                            <p className="text-xs text-gray-500">ID: {employee.Person_ID}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => parseEmployeeAddress(index)}
                                                            disabled={employee.isProcessing || !employee.Staying_Address}
                                                            className="bg-gray-700 hover:bg-gray-800 disabled:bg-gray-400 text-white text-xs font-medium py-1 px-3 rounded transition-colors duration-200"
                                                        >
                                                            {employee.isProcessing ? 'Đang xử lý...' : 'Phân tích'}
                                                        </button>
                                                    </div>

                                                    {/* Original Address */}
                                                    <div className="bg-gray-50 border border-gray-200 rounded p-2 mb-2">
                                                        <span className="text-xs font-medium text-gray-600">Địa chỉ gốc</span>
                                                        <p className="text-xs text-gray-700 mt-0.5">
                                                            {employee.Staying_Address || 'Không có địa chỉ'}
                                                        </p>
                                                    </div>

                                                    {/* Parsed Address */}
                                                    {employee.parsedAddress && (
                                                        <div className="bg-green-50 border border-green-200 rounded p-2">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="text-xs font-medium text-green-800">Địa chỉ chuẩn hóa</span>
                                                                <div className="flex items-center space-x-2">
                                                                    <div className="flex space-x-0.5">
                                                                        {[1, 2, 3].map((level) => (
                                                                            <div
                                                                                key={level}
                                                                                className={`w-1.5 h-1.5 rounded-full ${
                                                                                    level <= (employee.parsedAddress?.Parse_Success_Level || 0)
                                                                                        ? 'bg-green-500'
                                                                                        : 'bg-gray-300'
                                                                                }`}
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                    <button
                                                                        onClick={() => copyToClipboard(employee.parsedAddress?.New_Address || '', index)}
                                                                        className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-0.5 rounded transition-colors"
                                                                    >
                                                                        Copy
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <p className="text-xs text-green-900 font-medium">
                                                                {employee.parsedAddress.New_Address || 'Không xác định'}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="mt-4 text-center">
                    <div className="bg-white rounded-lg border border-gray-200 py-2 px-4">
                        <p className="text-xs text-gray-500">
                            © 2025 Address Parser System - Phát triển bởi IT HR Tỷ Xuân 2
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
