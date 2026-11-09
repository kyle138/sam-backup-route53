import { Route53Client, ListHostedZonesCommand, ListResourceRecordSetsCommand } from "@aws-sdk/client-route-53";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const route53 = new Route53Client();
const s3 = new S3Client();

export const handler = async (event) => {
    const bucketName = process.env.BACKUP_BUCKET_NAME;

    try {
        // Fetch all hosted zones in the account (With pagination, Joshua!)
        let hostedZones = [];
        let marker = undefined;

        do {
            const zonesResponse = await route53.send(new ListHostedZonesCommand({ Marker: marker }));
            if (zonesResponse.HostedZones) {
                hostedZones.push(...zonesResponse.HostedZones);
            }
            marker = zonesResponse.NextMarker;
        } while (marker);
        console.debug(`Found ${hostedZones.length} hosted zone(s) to back up.`); // DEBUG
        console.debug(`hostedZones: `,JSON.stringify(hostedZones,null,2)); // DEBUG

        // Generate YYYYMMDD date format once for this backup run
        const now = new Date();
        // const year = now.getUTCFullYear();
        // const month = String(now.getUTCMonth() + 1).padStart(2, '0');
        // const day = String(now.getUTCDate()).padStart(2, '0');
        // const dateStr = `${year}${month}${day}`;
        const dateStr = now.getUTCFullYear() + String(now.getUTCMonth() + 1).padStart(2, '0') + String(now.getUTCDate()).padStart(2, '0');
        console.debug(`dateStr: ${dateStr}`); // DEBUG

        // Loop through each hosted zone and backup its record sets
        for (const zone of hostedZones) {
            // Strip out the leading "/hostedzone/" prefix if present in Id
            const hostedZoneId = zone.Id.replace('/hostedzone/', '');
            const zoneName = zone.Name.replace(/\.$/, ''); // remove trailing dot

            let recordSets = [];
            let isTruncated = true;
            let nextRecordName;
            let nextRecordType;
            let nextRecordIdentifier;

            while (isTruncated) {
                const recordCommand = new ListResourceRecordSetsCommand({
                    HostedZoneId: hostedZoneId,
                    StartRecordName: nextRecordName,
                    StartRecordType: nextRecordType,
                    StartRecordIdentifier: nextRecordIdentifier,
                });

                const response = await route53.send(recordCommand);
                recordSets.push(...response.ResourceRecordSets);

                isTruncated = response.IsTruncated;
                if (isTruncated) {
                    nextRecordName = response.NextRecordName;
                    nextRecordType = response.NextRecordType;
                    nextRecordIdentifier = response.NextRecordIdentifier;
                }
            }

            const fileName = `R53/${zoneName}_${hostedZoneId}/${dateStr}.json`;
            const fileContent = JSON.stringify({
                HostedZoneId: hostedZoneId,
                ZoneName: zoneName,
                BackedUpAt: now.toISOString(),
                RecordSets: recordSets
            }, null, 2);

            await s3.send(new PutObjectCommand({
                Bucket: bucketName,
                Key: fileName,
                Body: fileContent,
                ContentType: 'application/json'
            }));

            console.log(`Successfully backed up zone ${zoneName} (${hostedZoneId}) to s3://${bucketName}/${fileName}`);
        }

        return { statusCode: 200, body: `Successfully backed up ${hostedZones.length} Route53 zone(s).` };
    } catch (error) {
        console.error("Error backing up Route53 zones:", error);
        throw error;
    }
};