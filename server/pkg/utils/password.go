package utils

import "golang.org/x/crypto/bcrypt"

// HashPassword bcrypt 加密
func HashPassword(plain string) (string, error) {
	if plain == "" {
		return "", nil
	}
	b, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.DefaultCost)
	return string(b), err
}

// VerifyPassword 校验明文与哈希
func VerifyPassword(hash, plain string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(plain)) == nil
}

// HashPasswordOrDefault 空明文时使用默认密码加密
func HashPasswordOrDefault(plain, def string) (string, error) {
	if plain == "" {
		plain = def
	}
	return HashPassword(plain)
}

// IsHashed 判断是否已是 bcrypt 哈希（防止重复加密）
func IsHashed(s string) bool {
	return len(s) > 4 && s[:4] == "$2a$" || len(s) > 4 && s[:4] == "$2b$"
}