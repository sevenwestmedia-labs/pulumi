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

// return a list of unique items
const unique = <T>(items: T[]): T[] => [...new Set<T>(items)]

// returns the smallest result
const min = <T>(x: T, y: T): T => (x < y ? x : y)

// return the absolute value of a number
const abs = (x: number): number => (x < 0 ? -x : x)

// produce a range of integers between n and m
const range = (n: number, m = 0): number[] =>
    [...Array.from(Array(abs(n - m)).keys())].map(x => x + min(n, m))

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

        const allDomains = [
            args.subject,
            ...(args.subjectAlternativeNames || []),
        ]
        const uniqueDomains = unique(allDomains)

        this.certValidationRecords = range(uniqueDomains.length).map(
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
                        parent: this,
                        dependsOn: this.certificate,
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
                parent: this,
                dependsOn: [this.certificate, ...this.certValidationRecords],
            },
        )

        this.certificateArn = this.certificateValidation.certificateArn
        this.registerOutputs()
    }
}
