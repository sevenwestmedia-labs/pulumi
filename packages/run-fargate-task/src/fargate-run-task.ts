import pulumi from '@pulumi/pulumi'
import awsx from '@pulumi/awsx'

import { fargateRunTaskResourceProvider } from './fargate-run-task-resource-provider'

export interface FargateRunTaskResourceInputs {
    awsRegion: pulumi.Input<string>
    clusterArn: pulumi.Input<string>
    taskDefinitionArn: pulumi.Input<string>
    deleteTaskDefinitionArn?: pulumi.Input<string>
    subnetIds: Array<pulumi.Input<string>>
    securityGroupIds: Array<pulumi.Input<string>>
}

export class FargateRunTask extends pulumi.dynamic.Resource {
    constructor(
        name: string,
        args: {
            cluster: awsx.ecs.Cluster
            taskDefinition: awsx.ecs.FargateTaskDefinition
            /** The ids of the subnets to run the task in, uses cluser public subnet by default */
            subnetIds?: Array<pulumi.Input<string>>
            /** Optionally run a task definition before cleanup */
            deleteTask?: awsx.ecs.FargateTaskDefinition
        },
        opts?: pulumi.CustomResourceOptions,
    ) {
        const awsConfig = new pulumi.Config('aws')

        const securityGroupIds = args.cluster.securityGroups.map(g => g.id)
        const subnetIds =
            args.subnetIds || args.cluster.vpc.getSubnetIds('public')

        const awsRegion = awsConfig.require('region')
        const resourceArgs: FargateRunTaskResourceInputs = {
            clusterArn: args.cluster.cluster.arn,
            taskDefinitionArn: args.taskDefinition.taskDefinition.arn,
            deleteTaskDefinitionArn: args.deleteTask
                ? args.deleteTask.taskDefinition.arn
                : undefined,
            awsRegion,
            subnetIds,
            securityGroupIds,
        }

        // TODO ensure this dynamic resource adds in the dependencies on the task definitions passed in
        super(
            fargateRunTaskResourceProvider,
            name,
            { taskArn: undefined, ...resourceArgs },
            opts,
        )
    }

    public readonly /*out*/ taskArn!: pulumi.Output<string>
}
