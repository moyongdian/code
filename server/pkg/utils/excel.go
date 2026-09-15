package utils

import (
	"bytes"
	"fmt"

	"github.com/xuri/excelize/v2"
)

// ExportToExcel 导出二维数组到 Excel 文件（返回字节），sheet 默认 Sheet1。
func ExportToExcel(headers []string, rows [][]interface{}) ([]byte, error) {
	f := excelize.NewFile()
	sheet := "Sheet1"
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		if err := f.SetCellValue(sheet, cell, h); err != nil {
			return nil, err
		}
	}
	for r, row := range rows {
		for cIdx, val := range row {
			cell, _ := excelize.CoordinatesToCellName(cIdx+1, r+2)
			if err := f.SetCellValue(sheet, cell, val); err != nil {
				return nil, err
			}
		}
	}
	buf, err := f.WriteToBuffer()
	if err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// ReadExcelRows 读取 Excel 全部行（二维字符串，含首行表头），用于批量导入。
func ReadExcelRows(data []byte) ([][]string, error) {
	f, err := excelize.OpenReader(bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("解析 Excel 失败: %v", err)
	}
	defer f.Close()
	rows, err := f.GetRows(f.GetSheetList()[0])
	if err != nil {
		return nil, err
	}
	return rows, nil
}