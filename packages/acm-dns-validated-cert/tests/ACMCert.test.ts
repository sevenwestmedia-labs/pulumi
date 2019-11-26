import * as pulumi from '@pulumi/pulumi'
import * as aws from '@pulumi/aws'
import * as cert from '../src'

// promise returns a resource output's value, even if it's undefined.
// (adapted from https://www.pulumi.com/blog/unit-testing-infrastructure-in-nodejs-and-mocha/)
export function promise<T>(output: pulumi.Output<T>): Promise<T | undefined> {
    return (output as any).promise() as Promise<T>
}

describe('ACMCert.constructor', () => {
    it('creates a DNS-validated certificate matching domains', async () => {
        const myCert = new cert.ACMCert('example', {
            subject: 'example.com',
            subjectAlternativeNames: [
                'www.example.com',
                'api.example.com',
            ].sort(),
            zoneName: 'example.com',
        })

        const domainName = await promise(myCert.certificate.domainName)

        if (domainName) {
            expect(domainName).toEqual('example.com')
        } else if (pulumi.runtime.isDryRun()) {
            console.warn(
                'Skipped myCert.certificate.domainName check' +
                    ' (not known during pulumi dry run)',
            )
        }

        const subjectAlternativeNames = await promise(
            myCert.certificate.subjectAlternativeNames,
        )

        if (subjectAlternativeNames) {
            expect(subjectAlternativeNames.sort()).toEqual(
                ['www.example.com', 'api.example.com'].sort(),
            )
        } else if (pulumi.runtime.isDryRun()) {
            console.warn(
                'Skipped myCert.certificate.subjectAlternativeNames check' +
                    ' (not known during pulumi dry run)',
            )
        }

        const validationMethod = await promise(
            myCert.certificate.validationMethod,
        )

        if (validationMethod) {
            expect(validationMethod).toEqual('DNS')
        } else if (pulumi.runtime.isDryRun()) {
            console.warn(
                'Skipped myCert.certificate.validationMethod check' +
                    ' (not known during pulumi dry run)',
            )
        }
    })

    it('creates validation records for subject and subjectAlternativeNames', async () => {
        const myCert = new cert.ACMCert('example', {
            subject: 'example.com',
            zoneName: 'example.com',
        })

        expect(myCert.certValidationRecords.length).toEqual(1)

        const myCertWithSANs = new cert.ACMCert('example', {
            subject: 'example.com',
            subjectAlternativeNames: ['www.example.com', 'api.example.com'],
            zoneName: 'example.com',
        })

        expect(myCertWithSANs.certValidationRecords.length).toEqual(3)
    })

    it('does not create duplicate validation records', async () => {
        const myCert = new cert.ACMCert('example', {
            subject: 'example.com',
            subjectAlternativeNames: [
                'example.com',
                'www.example.com',
                'api.example.com',
                'api.example.com',
            ],
            zoneName: 'example.com',
        })

        expect(myCert.certValidationRecords.length).toEqual(3)
    })

    // throws type errors
    it.skip('should use the provider given', async () => {
        const usEast1 = new aws.Provider('us-east-1', { region: 'us-east-1' })
        const myCert = new cert.ACMCert(
            'example',
            {
                subject: 'example.com',
                zoneName: 'example.com',
            },
            {
                provider: usEast1,
            },
        )

        const certificateArn = await promise(myCert.certificateArn)

        if (certificateArn) {
            expect(certificateArn).toContain('us-east-1')
        }
        if (pulumi.runtime.isDryRun()) {
            console.warn(
                'Skipped myCert.certificateArn provider check (not known' +
                    ' during pulumi dry run)',
            )
        }
    })

    // this test throws, but is caught and not re-thrown by pulumi
    it.skip('should throw an error if both zoneId and zoneName are specified', () => {
        expect(
            new cert.ACMCert('example', {
                subject: 'example.com',
                zoneId: '12345ASDF',
                zoneName: 'example.com',
            }),
        ).toThrow()
    })

    // this test throws, but is caught and not re-thrown by pulumi
    it.skip('should throw an error if neither zoneId nor zoneName are specified', () => {
        expect(
            new cert.ACMCert('example', {
                subject: 'example.com',
            }),
        ).toThrow()
    })
})
