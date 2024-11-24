### JWT
To generate the public/private key pairs use the following commands :
**Private key**:
``` bash
openssl genpkey -algorithm RSA -out jwt/private.pem -pkeyopt rsa_keygen_bits:2048
```
**Public key**
``` bash
openssl rsa -in jwt/private.pem -pubout -out jwt/public.pem
```

> [!warning] Keys path
> Note that the path for the private should match in both commands  

You can then verify that the keys are correct by running the following command:
``` bash
openssl rsa -check -in jwt/private.pem
```