import * as pulumi from '@pulumi/pulumi'
import * as aws from '@pulumi/aws'

export interface ZoneNameArgs {
    zoneName?: string
}

export interface ZoneIdArgs {
    zoneId?: string
}

export interface CommonArgs {
    name?: string | pulumi.Input<string>
    subject: string | pulumi.Input<string>
    subjectAlternativeNames?: string[]
}

type ACMCertArgs = ZoneIdArgs & ZoneNameArgs & CommonArgs

export class ACMCert extends pulumi.ComponentResource {
    public readonly certificate: aws.acm.Certificate
    public readonly zoneId: string | pulumi.Input<string>
    public readonly certificateValidation: aws.acm.CertificateValidation
    public readonly certValidationRecords: aws.route53.Record[]
    public readonly certificateArn: pulumi.Output<string>

    constructor(
        name: string,
        private args: ACMCertArgs,
        opts?: pulumi.ResourceOptions,
    ) {
        super('ACMCert', name, {}, opts)

        const selectedName = args.name ? args.name : name

        if (args.zoneName && args.zoneId) {
            throw new Error(
                'You must set either zoneName or zoneId (but not both)' +
                    ' when creating a new ACMCert',
            )
        }

        if (args.zoneId) {
            this.zoneId = args.zoneId
        } else if (args.zoneName) {
            this.zoneId = pulumi
                .output(
                    aws.route53.getZone(
                        {
                            name: args.zoneName,
                        },
                        {
                            ...opts,
                            parent: this,
                            async: true,
                        },
                    ),
                )
                .apply((zone: aws.route53.GetZoneResult) => zone.id)
        } else {
            throw new Error(
                'You must set zoneName or zoneId when creating a new ACMCert',
            )
        }

        this.certificate = new aws.acm.Certificate(
            `${selectedName}-cert`,
            {
                domainName: args.subject,
                subjectAlternativeNames: args.subjectAlternativeNames,
                validationMethod: 'DNS',
            },
            {
                ...opts,
                parent: this,
            },
        )

        const numberOfUniqueDomains = [
            ...new Set([args.subject, ...(args.subjectAlternativeNames || [])]),
        ].length

        this.certValidationRecords = Array(numberOfUniqueDomains)
            .fill(null)
            .map(
                (_, i) =>
                    new aws.route53.Record(
                        `${selectedName}-validation-record-${i}`,
                        {
                            name: this.certificate.domainValidationOptions[i]
                                .resourceRecordName,
                            records: [
                                this.certificate.domainValidationOptions[i]
                                    .resourceRecordValue,
                            ],
                            ttl: 60,
                            type: this.certificate.domainValidationOptions[i]
                                .resourceRecordType,
                            zoneId: this.zoneId,
                        },
                        {
                            ...opts,
                            parent: this.certificate,
                            deleteBeforeReplace: true, // prevent duplicate records on update
                        },
                    ),
            )

        this.certificateValidation = new aws.acm.CertificateValidation(
            `${selectedName}-cert-validation`,
            {
                certificateArn: this.certificate.arn,
                validationRecordFqdns: this.certValidationRecords.map(
                    r => r.fqdn,
                ),
            },
            {
                ...opts,
                parent: this.certificate,
            },
        )

        this.certificateArn = this.certificateValidation.certificateArn
        this.registerOutputs()
    }
}
