const opcua = require("node-opcua");

async function writeTag(nodeId, value) {
    const client = opcua.OPCUAClient.create({
        endpoint_must_exist: false
    });

    try {
        await client.connect("opc.tcp://localhost:62541");
        const session = await client.createSession();

        await session.write({
            nodeId,
            attributeId: opcua.AttributeIds.Value,
            value: {
                value: {
                    dataType: opcua.DataType.String,
                    value: typeof value === "string" ? value : JSON.stringify(value)
                }
            }
        });

        await session.close();
        await client.disconnect();
        console.log("OPC-UA: tag updated:", nodeId);

    } catch (err) {
        console.error("OPC-UA Error:", err);
    }
}

module.exports = { writeTag };
