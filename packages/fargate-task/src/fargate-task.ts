import pulumi from '@pulumi/pulumi'
import awsx from '@pulumi/awsx'

import { fargateTaskResourceProvider } from './fargate-task-resource-provider'

export interface FargateTaskResourceInputs {
    awsRegion: pulumi.Input<string>
    clusterArn: pulumi.Input<string>
    taskDefinitionArn: pulumi.Input<string>
    deleteTaskDefinitionArn?: pulumi.Input<string>
    subnetIds: Array<pulumi.Input<string>>
    securityGroupIds: Array<pulumi.Input<string>>
}

export class FargateTask extends pulumi.dynamic.Resource {
    constructor(
        name: string,
        args: {
            cluster: awsx.ecs.Cluster
            taskDefinition: awsx.ecs.FargateTaskDefinition
            /** The ids of the subnets to run the task in, uses cluser public subnet by default */
            subnetIds?: Array<pulumi.Input<string>>
            deleteTask?: awsx.ecs.FargateTaskDefinition
        },
        opts?: pulumi.CustomResourceOptions,
    ) {
        const awsConfig = new pulumi.Config('aws')

        const securityGroupIds = args.cluster.securityGroups.map(g => g.id)
        const subnetIds =
            args.subnetIds || args.cluster.vpc.getSubnetIds('public')

        const awsRegion = awsConfig.require('region')
        const resourceArgs: FargateTaskResourceInputs = {
            clusterArn: args.cluster.cluster.arn,
            taskDefinitionArn: args.taskDefinition.taskDefinition.arn,
            deleteTaskDefinitionArn: args.deleteTask
                ? args.deleteTask.taskDefinition.arn
                : undefined,
            awsRegion,
            subnetIds,
            securityGroupIds,
        }

        super(
            fargateTaskResourceProvider,
            name,
            { taskArn: undefined, ...resourceArgs },
            opts,
        )
    }

    public readonly /*out*/ taskArn!: pulumi.Output<string>
}
