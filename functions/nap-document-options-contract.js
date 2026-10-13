"use strict";

// File writers keep this original field list: editorial ranks are never part of
// their upserts or fingerprints, before or after the additive migration.
const FILE_SCHEMA = [["document_id","int"],["category","varchar(16)"],["file_name","varchar(180)"],["storage_path","varchar(160)"],["content_type","varchar(100)"],["size","int unsigned"],["version","bigint unsigned"],["created_at","datetime(6)"],["updated_at","datetime(6)"],["created_by","varchar(128)"],["updated_by","varchar(128)"]];
const NULLABLE_FILE_FIELDS = new Set(["category", "file_name", "storage_path", "content_type", "size"]);
const FEATURED_INDEX = "livepalmes_document_featured_rank";
const normalizedType = value => String(value).replace(/\b(bigint|tinyint|int)\(\d+\)/g, "$1");

function documentOptionsContract(columns, indexes) {
  const extended = columns.length === FILE_SCHEMA.length + 1;
  if (!extended && columns.length !== FILE_SCHEMA.length) throw new TypeError("Complément de documents incompatible.");
  const expected = extended ? [...FILE_SCHEMA, ["featured_rank", "tinyint unsigned"]] : FILE_SCHEMA;
  if (columns.some((column, i) => {
    const [name, type] = expected[i];
    const nullable = extended && (name === "featured_rank" || NULLABLE_FILE_FIELDS.has(name));
    return column.COLUMN_NAME !== name || normalizedType(column.COLUMN_TYPE) !== type ||
      column.IS_NULLABLE !== (nullable ? "YES" : "NO") || column.COLUMN_DEFAULT !== null || Boolean(column.EXTRA);
  })) throw new TypeError("Complément de documents incompatible.");
  const expectedIndexes = extended ? [[FEATURED_INDEX, "featured_rank"], ["PRIMARY", "document_id"]] : [["PRIMARY", "document_id"]];
  if (indexes.length !== expectedIndexes.length || indexes.some((index, i) =>
    index.INDEX_NAME !== expectedIndexes[i][0] || index.COLUMN_NAME !== expectedIndexes[i][1] ||
    Number(index.SEQ_IN_INDEX) !== 1 || Number(index.NON_UNIQUE) !== 0 || index.SUB_PART !== null
  )) throw new TypeError("Index des documents incompatible.");
  return extended ? "featured" : "original";
}

module.exports = { FILE_SCHEMA, NULLABLE_FILE_FIELDS, FEATURED_INDEX, documentOptionsContract };
