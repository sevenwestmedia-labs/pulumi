# acm-dns-validated-cert

This module:

-   creates a certificate in AWS Certificate Manager (ACM)
-   creates associated DNS validation records in Route53
-   waits for the DNS records to be validated, and the certificate to be issued.

# Usage

This example will create an ACM certificate, and create validation records in
the 'example.com' Route53 zone.

```
import * as acmCert from 'pulumi-acm-dns-validated-cert'

const cert = new acmCert.ACMCert('example-cert', {
    subject: 'www.example.com',
    zoneName: 'example.com',
})

export const certArn = cert.certificateArn
```

If preferred, you can specify the zoneId instead. You can also use
`subjectAlternativeNames` to create a certificate with multiple domains:

```
const cert = new acmCert.ACMCert('example-cert', {
    subject: 'example.com',
    subjectAlternativeNames: [
        'www.example.com',
    ]
    zoneId: 'MY-ZONE-ID',
})
```

Sometimes, you need to create the certificate in a non-default region. Pulumi
allows you to specify your own provider and pass it in using `opts`. The next
example creates the certificate in the `us-east-1` region:

```
import * as aws from '@pulumi/aws'

const useast1 = new aws.Provider('us-east-1', {
    region: 'us-east-1'
})

const cert = new acmCert.ACMCert('example-cert', {
    subject: 'example.com',
    zoneId: 'example.com',
},
{
    provider: useast1,
})
```
