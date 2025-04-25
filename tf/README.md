# Commands

```
terraform init
```

```
terraform plan \
    -var "do_token=${DO_PAT}" \
    -var "pvt_key=~/.ssh/id_rsa_tf" \
    -var "aws_access_key=$AWS_ACCESS_KEY" \
    -var "aws_secret_access_key=$AWS_SECRET_ACCESS_KEY"
```

```
terraform apply \
    -var "do_token=${DO_PAT}" \
    -var "pvt_key=~/.ssh/id_rsa_tf" \
    -var "aws_access_key=$AWS_ACCESS_KEY" \
    -var "aws_secret_access_key=$AWS_SECRET_ACCESS_KEY"
```


References:
- https://www.digitalocean.com/community/tutorials/how-to-use-terraform-with-digitalocean
- https://www.digitalocean.com/community/tutorials/how-to-configure-nginx-as-a-reverse-proxy-on-ubuntu-22-04#step-2-configuring-your-server-block
