import { loadFiles } from "../util";
import { type EthnicityDatum } from "./HaploEthnicities";

export type Branch = {
  branchId: number;
  parentBranchId: number;
  distance: number;
  weight: number;
  branchFrom: number;
  branchTo: number;
  line?: SVGLineElement & { ethnic?: EthnicityDatum };
  beam?: SVGLineElement;
  children?: Branch[];
};

export type Mutation = {
  snp: number;
  posOfSnp: number;
  dist: number;
  rsId: string;
  treeIndex: number;
  branchIndices: number[];
  isNotMapping: number;
  isFlipped: number;
  ageBegin: number;
  ageEnd: number;
  alleles: string[];
};

export type Region = {
  start: number;
  end: number;
};

export type Ancestor = {
  branches: Branch[];
  region: Region;
};
/**
 * Class representing a dataset containing haplotypes, mutations, and ancestor information.
 */
class Dataset {
  #id: string = "";
  #haplotypes: string[] = [];
  #mutations: Mutation[] = [];
  #ancestors: Ancestor[] = [];
  #mutationsByHaplotype: number[][] = [];

  static #instance: Dataset | null = null;

  static get instance() {
    if (!this.#instance) {
      this.#instance = new Dataset();
    }
    return this.#instance;
  }

  private constructor() {}

  static async initialise({
    id,
    folderURL,
  }: {
    id: string;
    folderURL: string;
  }) {
    await this.instance.init(id, folderURL);

    return this.instance;
  }

  /**
   * Defines the dataset by loading and parsing the data files.
   *
   * @param {string} id - The identifier for the dataset files.
   */
  async init(id: string, folderURL: string) {
    console.log("init", id, folderURL);
    this.#id = id;
    const path = `${folderURL}${id}`;
    try {
      const [ancData, mutData, hapData] = await loadFiles(
        [".anc", ".mut", ".haploidid.fullassembled.BOTH.txt"].map(
          (ext) => path + ext
        )
      );
      this.#parseHaprotypes(hapData);
      this.#parseMutations(mutData);
      this.#parseAncestors(ancData);
      this.#getMutationsByHaplotype();
    } catch (error) {
      throw new Error("Error fetching file:" + error);
    }
  }

  /**
   * Parses the haplotype data.
   */
  #parseHaprotypes(hapData: string) {
    // Get haplotypes
    this.#haplotypes = hapData
      .split("\n")
      .filter((line) => line.length > 0)
      .map((hap) => hap.split(".")[0]);
  }

  /**
   * Parses the mutation data.
   */
  #parseMutations(mutData: string) {
    const lines = mutData.trim().split("\n").slice(1); // Exclude header line
    this.#mutations = lines
      .filter((line) => line.length > 0)
      .map((line) => {
        const parts = line.split(";").map((part) => part.trim());
        return {
          snp: parseInt(parts[0], 10),
          posOfSnp: parseInt(parts[1], 10),
          dist: parseInt(parts[2], 10),
          rsId: parts[3],
          treeIndex: parseInt(parts[4], 10),
          branchIndices: parts[5]
            .split(" ")
            .map((index) => parseInt(index, 10)),
          isNotMapping: parseInt(parts[6], 10),
          isFlipped: parseInt(parts[7], 10),
          ageBegin: parseFloat(parts[8]),
          ageEnd: parseFloat(parts[9]),
          alleles: parts[10].split("/"),
        };
      });
  }

  /**
   * Parses the ancestor data.
   */
  #parseAncestors(ancData: string) {
    const treesRawData = ancData.trim().split("\n").slice(2);
    const startNumbers = treesRawData
      .filter((line) => line.length > 0)
      .map((tree) => parseInt(tree.match(/^(\d+)/)![0]));

    const regions = startNumbers.map((start, index) => {
      return {
        start,
        end: startNumbers[index + 1]
          ? startNumbers[index + 1] - 1
          : this.#mutations[this.#mutations.length - 1].snp,
      };
    });

    this.#ancestors = treesRawData.map((tree, index) => {
      const treeData = tree.match(/:\s*(.+)/)![1];

      const branches = treeData
        .split(") ")
        .filter((branch: string) => branch)
        .map((branch: string, index: number) => {
          // Restore the closing parenthesis lost during split
          branch = branch.trim().endsWith(")") ? branch : branch + ")";
          const branchParts = branch.match(
            /(-?\d+):\(([\d.]+) ([\d.]+) (-?\d+) (-?\d+)\)/
          );
          return {
            branchId: index,
            parentBranchId: parseInt(branchParts![1], 10),
            distance: parseFloat(branchParts![2]),
            weight: parseFloat(branchParts![3]),
            branchFrom: parseInt(branchParts![4], 10),
            branchTo: parseInt(branchParts![5], 10),
          };
        }) as Branch[];

      for (const branch of branches) {
        const children = branches.filter(
          (child) => child.parentBranchId === branch.branchId
        );
        if (children.length > 0) {
          branch.children = children;
        }
      }
      return { branches, region: regions[index] };
    });
  }

  /**
   * Creates a matrix of mutations by haplotype.
   */
  #getMutationsByHaplotype() {
    const findChildren = (
      branchId: number,
      treeIndex: number,
      mutatedBranches: number[]
    ) => {
      mutatedBranches.push(branchId);
      const branches = this.#ancestors[treeIndex].branches.filter(
        (branch) => branch.parentBranchId === branchId
      );
      if (branches.length !== 0) {
        for (const branch of branches) {
          findChildren(branch.branchId, treeIndex, mutatedBranches);
        }
      }
    };

    this.#mutationsByHaplotype = new Array(this.#haplotypes.length)
      .fill(null)
      .map(() => new Array(this.#mutations.length).fill(0));

    for (let i = 0; i < this.#mutations.length; i++) {
      const { treeIndex, branchIndices } = this.#mutations[i];
      const mutatedBranches: number[] = [];
      for (const branchId of branchIndices) {
        findChildren(branchId, treeIndex, mutatedBranches);
      }
      for (let i2 = 0; i2 < mutatedBranches.length; i2++) {
        if (this.#mutationsByHaplotype[mutatedBranches[i2]]) {
          this.#mutationsByHaplotype[mutatedBranches[i2]][i] = 1;
        }
      }
    }
  }

  getLeafBranches(branch: Branch | undefined): Branch[] {
    if (!branch) {
      return [];
    }

    const leaves: Branch[] = [];

    const findLeaves = (branch: Branch) => {
      if (branch.children) {
        for (const child of branch.children) {
          findLeaves(child);
        }
      } else {
        leaves.push(branch);
      }
    };

    findLeaves(branch);

    return leaves;
  }

  getDescendantsBranches(branch: Branch): Branch[] {
    const descendants: Branch[] = [];

    const findDescendants = (branch: Branch) => {
      descendants.push(branch);
      if (branch.children) {
        for (const child of branch.children) {
          findDescendants(child);
        }
      }
    };

    findDescendants(branch);

    return descendants;
  }

  get haplotypes() {
    return this.#haplotypes;
  }

  get mutations() {
    return this.#mutations;
  }

  get ancestors() {
    return this.#ancestors;
  }
  get mutationTotalLength() {
    return this.#ancestors[this.#ancestors.length - 1].region.end;
  }

  get mutationsByHaplotype() {
    return this.#mutationsByHaplotype;
  }

  get chromosome() {
    const match = this.#id.match(/chr(\d+)/);
    return match ? match[1] : "";
  }
}

export { Dataset };
