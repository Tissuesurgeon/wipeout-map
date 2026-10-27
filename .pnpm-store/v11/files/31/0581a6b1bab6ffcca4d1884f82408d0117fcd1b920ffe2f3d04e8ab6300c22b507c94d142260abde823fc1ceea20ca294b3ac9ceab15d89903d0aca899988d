import { NotConfiguredError } from "./errors.js";
import * as MachineryAbi from "./machineryAbi.js";
import * as MachineryWriter from "./machineryWriter.js";
export function createGovernanceAdminWithDeps(config, deps) {
    const binaryModule = deps.getConfig().addresses?.binaryModule;
    const writer = MachineryWriter.makeMachineryWriter(config, deps, "createGovernanceAdmin");
    const pc = () => deps.getClient();
    function requireModule() {
        if (!binaryModule) {
            throw new NotConfiguredError("config.addresses.binaryModule", "createGovernanceAdmin");
        }
        return binaryModule;
    }
    async function getModuleOwner() {
        return await pc().readContract({
            address: requireModule(),
            abi: MachineryAbi.moduleGovernanceAbi,
            functionName: "owner",
        });
    }
    return {
        async setAdapterApproved(p) {
            return writer.execute({
                to: requireModule(),
                abi: MachineryAbi.moduleGovernanceAbi,
                functionName: "setAdapterApproved",
                args: [p.adapter, p.approved],
                gas: p.gas,
            });
        },
        getModuleOwner,
        async isModuleOwner(addr) {
            const owner = await getModuleOwner();
            return owner.toLowerCase() === addr.toLowerCase();
        },
    };
}
