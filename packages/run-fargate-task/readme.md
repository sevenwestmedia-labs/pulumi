# pulumi-run-fargate-task

Executes a fargate task definition then waits for it's completion during previsioning. This is useful to run once of tasks like database migrations inside AWS so you don't need to expose your database publicly.

## Example

```ts
// A docker image with a command line tool to create / drop / run database migrations
const DatabaseMigratorImage = awsx.ecs.Image.fromDockerBuild(
    'database-migrator-image',
    {
        context: './database-migrator',
        dockerfile: './database-migrator/dockerfile',
    },
)

// FargateTaskDefinition to create the database & run database migrations
const createDbTaskDefinition = new awsx.ecs.FargateTaskDefinition('setup-db', {
    container: {
        image: DatabaseMigratorImage,
        command: pulumi
            .all([masterConnectionString, connectionString, databaseName])
            .apply(([master, instance, db]) => [
                '/bin/sh',
                '-c',
                `node database-migrator.js create-db --masterConnectionString=${master} --databaseName=${db} && node database-migrator.js --connectionString=${instance} --databaseName=${db} --app=thewest`,
            ]),
    },
})

const dropDbTaskDefinition = new awsx.ecs.FargateTaskDefinition('drop-db', {
    container: {
        image: DatabaseMigratorImage,
        command: pulumi
            .all([masterConnectionString, databaseName])
            .apply(([connectionString, db]) => [
                'node',
                'database-migrator.js',
                'drop-db',
                `--masterConnectionString=${connectionString}`,
                `--databaseName=${db}`,
            ]),
    },
})

const setupDbTask = new FargateTask(
    'setup-db-task',
    {
        cluster: this.args.cluster,
        taskDefinition: createDbTaskDefinition,
        deleteTask: dropDbTaskDefinition,
        subnetIds: args.subnetIds,
    },
    {
        // In the future this will be done for you
        dependsOn: [createDbTaskDefinition, dropDbTaskDefinition],
    },
)
```
