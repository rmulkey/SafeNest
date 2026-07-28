/**
 * Representative CPSC recall fixtures.
 *
 * Field names and shapes mirror real responses from
 * https://www.saferproducts.gov/RestWebServices/Recall?format=json
 * (verified against live output while building this pipeline). Titles are based
 * on genuine recall wording patterns so the matcher is exercised realistically.
 */
import type { CpscRawRecall } from "../cpsc-client";

/** A real-world-shaped toy recall with model numbers. */
export const TEETHING_TOY_RECALL: CpscRawRecall = {
  RecallID: 30001,
  RecallNumber: "26-701",
  RecallDate: "2026-07-23T00:00:00",
  LastPublishDate: "2026-07-23T00:00:00",
  Title:
    "Aojieni Silicone Recalls Sili Factory Pull String Teething Toys Due to Choking Hazard",
  Description:
    "This recall involves <b>Sili Factory</b> pull string teething toys. The toys were sold in multiple colors.&nbsp;",
  URL: "https://www.cpsc.gov/Recalls/2026/Aojieni-Silicone-Recalls-Sili-Factory-Pull-String-Teething-Toys",
  Hazards: [{ Name: "The teething toy can break, posing a choking hazard." }],
  Remedies: [{ Name: "Refund" }],
  RemedyOptions: [{ Option: "Contact the firm for a full refund." }],
  Products: [
    {
      Name: "Sili Factory Pull String Teething Toy",
      Model: "SF-1180",
      Type: "Toys",
      NumberOfUnits: "About 4,900",
    },
  ],
  Manufacturers: [{ Name: "Aojieni Silicone Co., Ltd." }],
  Retailers: [{ Name: "Amazon.com" }],
  Images: [
    {
      URL: "https://www.cpsc.gov/s3fs-public/teething-toy.jpg",
      Caption: "Recalled teething toy",
    },
  ],
  Injuries: [{ Name: "No injuries reported" }],
};

/** A magnet recall naming a brand present in the catalog. */
export const MAGNET_RECALL: CpscRawRecall = {
  RecallID: 30002,
  RecallNumber: "26-702",
  RecallDate: "2026-07-10T00:00:00",
  LastPublishDate: "2026-07-12T00:00:00",
  Title: "Magnetic Building Sticks Sets Recalled Due to Ingestion Hazard",
  Description:
    "The recalled magnetic building sticks contain small magnets that can detach.",
  URL: "https://www.cpsc.gov/Recalls/2026/Magnetic-Building-Sticks-Sets-Recalled",
  Hazards: [
    { Name: "Loose magnets can be ingested, causing serious internal injury." },
  ],
  Remedies: [{ Name: "Refund" }],
  Products: [
    { Name: "Magnetic Building Sticks Set", Model: "MBS-500", Type: "Toys" },
  ],
  Manufacturers: [{ Name: "Generic Import Co." }],
  Images: [],
};

/** A non-toy recall, to confirm child-product filtering behaves. */
export const DRESSER_RECALL: CpscRawRecall = {
  RecallID: 30003,
  RecallNumber: "26-703",
  RecallDate: "2026-07-23T00:00:00",
  Title:
    "12-Drawer Fabric Dressers Recalled Due to Risk of Serious Injury or Death",
  Description: "The recalled fabric dressers are unstable and can tip over.",
  URL: "https://www.cpsc.gov/Recalls/2026/12-Drawer-Fabric-Dressers-Recalled",
  Hazards: [{ Name: "Tip-over and entrapment hazard" }],
  Remedies: [{ Name: "Repair" }],
  Products: [{ Name: "12-Drawer Fabric Dresser", Type: "Furniture" }],
  Manufacturers: [{ Name: "Home Goods Import" }],
};

/** Unusable: no URL and no identifier — must be skipped, never guessed at. */
export const INCOMPLETE_RECALL: CpscRawRecall = {
  RecallDate: "2026-07-01T00:00:00",
  Title: "Some Product Recalled",
};

/** Same recall number as TEETHING_TOY_RECALL but re-published later. */
export const TEETHING_TOY_RECALL_REPUBLISHED: CpscRawRecall = {
  ...TEETHING_TOY_RECALL,
  LastPublishDate: "2026-07-25T00:00:00",
  Description: "Updated description after republication.",
};

export const ALL_FIXTURES: CpscRawRecall[] = [
  TEETHING_TOY_RECALL,
  MAGNET_RECALL,
  DRESSER_RECALL,
  INCOMPLETE_RECALL,
];
