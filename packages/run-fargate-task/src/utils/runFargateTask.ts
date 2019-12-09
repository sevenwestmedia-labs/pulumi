import awsSdk from 'aws-sdk'
import { Config } from '@pulumi/pulumi'

export interface FargateRunTask {
    clusterArn: string
    taskDefinitionArn: string
    subnetIds: string[]
    securityGroupIds: string[]
}

const awsConfig = new Config('aws')
const awsRegion = awsConfig.require('region')

export async function runFargateTask(inputs: FargateRunTask) {
    const ecs = new awsSdk.ECS({ region: awsRegion })

    const result = await ecs
        .runTask({
            cluster: inputs.clusterArn,
            taskDefinition: inputs.taskDefinitionArn,
            launchType: 'FARGATE',
            networkConfiguration: {
                awsvpcConfiguration: {
                    subnets: inputs.subnetIds,
                    securityGroups: inputs.securityGroupIds,
                },
            },
        })
        .promise()
    if (!result.tasks) {
        throw new Error('Missing tasks')
    }
    if (result.tasks.length !== 1) {
        throw new Error(`Unexpected number of tasks: ${result.tasks.length}`)
    }
    const task = result.tasks[0]
    if (!task.taskArn) {
        throw new Error(`Task missing taskArn`)
    }
    const taskArn = task.taskArn
    const runResult = await ecs
        .waitFor('tasksStopped', {
            tasks: [taskArn],
            cluster: inputs.clusterArn,
        })
        .promise()
    if (!runResult.tasks) {
        throw new Error('Missing tasks')
    }
    if (runResult.tasks.length !== 1) {
        throw new Error(`Unexpected number of tasks: ${runResult.tasks.length}`)
    }
    if (!runResult.tasks[0].containers) {
        throw new Error('Task status is missing container')
    }
    if (runResult.tasks[0].containers.length !== 1) {
        throw new Error(
            `Unexpected number of containers: ${runResult.tasks[0].containers.length}.

You should only run a task definition with a single container configured`,
        )
    }
    return {
        taskArn,
        exitCode: runResult.tasks[0].containers[0].exitCode,
    }
}
