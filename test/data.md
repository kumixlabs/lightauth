# LightAuth Test Data

## Test OTPAuth URIs
Copy-paste these into the "Import URI" dialog.

### Single accounts
```
otpauth://totp/GitHub:johndoe@github.com?secret=JBSWY3DPEHPK3PXP&issuer=GitHub&algorithm=SHA1&digits=6&period=30
```

```
otpauth://totp/Google:john@gmail.com?secret=HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ&issuer=Google&algorithm=SHA1&digits=6&period=30
```

```
otpauth://totp/AWS:admin@company.com?secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ&issuer=Amazon%20Web%20Services&algorithm=SHA1&digits=6&period=30
```

```
otpauth://totp/Discord:player123@discord.com?secret=KVKFKRCPNZQUYMLXOVYDSQKGOJRFIXJU&issuer=Discord&algorithm=SHA1&digits=6&period=30
```

```
otpauth://totp/Cloudflare:devops@company.com?secret=NFTGY3LFONZWC4RAMEQHEZLBNRSXG5DB&issuer=Cloudflare&algorithm=SHA1&digits=6&period=30
```

### 8-digit / SHA256 / SHA512 (edge cases)
```
otpauth://totp/Binance:trader@crypto.com?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP&issuer=Binance&algorithm=SHA256&digits=8&period=30
```

```
otpauth://totp/ProtonMail:secure@proton.me?secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ&issuer=ProtonMail&algorithm=SHA512&digits=6&period=30
```

### 60-second period
```
otpauth://totp/Steam:gamer42?secret=HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ&issuer=Steam&algorithm=SHA1&digits=6&period=60
```

### Multi-line (paste all at once into Import URI)
```
otpauth://totp/GitHub:johndoe@github.com?secret=JBSWY3DPEHPK3PXP&issuer=GitHub
otpauth://totp/Google:john@gmail.com?secret=HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ&issuer=Google
otpauth://totp/AWS:admin@company.com?secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ&issuer=Amazon%20Web%20Services
otpauth://totp/Discord:player123@discord.com?secret=KVKFKRCPNZQUYMLXOVYDSQKGOJRFIXJU&issuer=Discord
otpauth://totp/Cloudflare:devops@company.com?secret=NFTGY3LFONZWC4RAMEQHEZLBNRSXG5DB&issuer=Cloudflare
```
