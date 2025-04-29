#!/bin/bash

# ref: https://www.digitalocean.com/community/tutorials/how-to-secure-nginx-with-let-s-encrypt-on-ubuntu-22-04
sudo certbot --nginx -d commentaryjs.miguel-martin.com --non-interactive -m miguel@miguel-martin.com --agree-tos
sudo certbot renew --dry-run
