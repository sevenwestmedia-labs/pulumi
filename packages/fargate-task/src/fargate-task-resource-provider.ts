import * as pulumi from '@pulumi/pulumi'

import { runFargateTask, FargateRunTask } from './utils/runFargateTask'

export interface FargateTaskInputs extends FargateRunTask {
    deleteTaskDefinitionArn?: string
}

export const fargateTaskResourceProvider: pulumi.dynamic.ResourceProvider = {
    async create(inputs: FargateTaskInputs) {
        const { exitCode, taskArn } = await runFargateTask(inputs)

        if (exitCode !== 0) {
            throw new Error(`Task run failed: ${taskArn}`)
        }

        return {
            // The task is ephemeral, we don't need an ID because it will be
            // gone by the time this resource runs
            id: 'not-needed',
            taskArn,
        }
    },

    async update(
        _id,
        _oldInputs: FargateTaskInputs,
        newInputs: FargateTaskInputs,
    ) {
        const { exitCode, taskArn } = await runFargateTask(newInputs)
        if (exitCode !== 0) {
            throw new Error(`Task run failed: ${taskArn}`)
        }

        return {
            outs: { taskArn },
        }
    },

    async delete(id, inputs: FargateTaskInputs) {
        if (inputs.deleteTaskDefinitionArn) {
            const { exitCode, taskArn } = await runFargateTask({
                ...inputs,
                taskDefinitionArn: inputs.deleteTaskDefinitionArn,
            })

            if (exitCode !== 0) {
                throw new Error(`Task run failed: ${taskArn}`)
            }
        }
    },

    async diff() {
        return {
            // Always report changes so Pulumi will run this tasks lifecycle
            // functions
            changes: true,
        }
    },
}
