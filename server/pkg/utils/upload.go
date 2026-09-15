package utils

import (
	"fmt"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"xiaobaizuobishe-server/pkg/config"
)

var allowExt = map[string]bool{
	".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true,
	".bmp": true, ".mp4": true, ".mov": true, ".xlsx": true, ".xls": true,
	".csv": true, ".doc": true, ".docx": true, ".pdf": true, ".txt": true,
}

// SaveFile 保存上传文件到 upload.dir，重名加时间戳前缀，返回可由 ip:port 访问的链接。
func SaveFile(c *gin.Context, file *multipart.FileHeader, cfg *config.Config) (string, error) {
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if !allowExt[ext] {
		return "", fmt.Errorf("不支持的文件类型: %s", ext)
	}
	dir := cfg.Upload.Dir
	if dir == "" {
		dir = "./files"
	}
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", err
	}
	name := fmt.Sprintf("%d%v%v", time.Now().UnixMilli(), "_", file.Filename)
	// 去除文件名中的非法字符
	name = sanitize(name, ext)
	if err := c.SaveUploadedFile(file, filepath.Join(dir, name)); err != nil {
		return "", err
	}
	return fmt.Sprintf("http://%s:%s/file/yulan/%s", cfg.IP, cfg.Server.Port, name), nil
}

func sanitize(name, ext string) string {
	name = strings.ReplaceAll(name, " ", "_")
	name = strings.ReplaceAll(name, "\\", "_")
	name = strings.ReplaceAll(name, "/", "_")
	if filepath.Ext(name) == "" {
		name += ext
	}
	return name
}

// FilePath 拼接存储路径
func FilePath(cfg *config.Config, name string) string {
	return filepath.Join(cfg.Upload.Dir, name)
}