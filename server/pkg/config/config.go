package config

import (
	"log"
	"os"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Server   ServerConfig   `yaml:"server"`
	IP       string         `yaml:"ip"`
	Database DatabaseConfig `yaml:"database"`
	JWT      JWTConfig      `yaml:"jwt"`
	Upload   UploadConfig   `yaml:"upload"`
}

type ServerConfig struct {
	Port string `yaml:"port"`
}

type DatabaseConfig struct {
	Driver string `yaml:"driver"`
	DSN    string `yaml:"dsn"`
}

type JWTConfig struct {
	Secret      string `yaml:"secret"`
	ExpireHours int    `yaml:"expire-hours"`
}

type UploadConfig struct {
	Dir     string `yaml:"dir"`
	MaxSize int64  `yaml:"max-size"`
}

// Load 读取 YAML 配置文件（支持环境变量覆盖关键配置）。
func Load(path string) *Config {
	data, err := os.ReadFile(path)
	if err != nil {
		log.Fatalf("读取配置文件失败: %v", err)
	}
	cfg := &Config{}
	if err := yaml.Unmarshal(data, cfg); err != nil {
		log.Fatalf("解析配置文件失败: %v", err)
	}
	// 环境变量覆盖（生产部署时推荐）
	if v := os.Getenv("JWT_SECRET"); v != "" {
		cfg.JWT.Secret = v
	}
	if v := os.Getenv("DB_DSN"); v != "" {
		cfg.Database.DSN = v
	}
	if v := os.Getenv("DB_DRIVER"); v != "" {
		cfg.Database.Driver = v
	}
	if cfg.JWT.ExpireHours <= 0 {
		cfg.JWT.ExpireHours = 2
	}
	if cfg.Server.Port == "" {
		cfg.Server.Port = "9090"
	}
	return cfg
}