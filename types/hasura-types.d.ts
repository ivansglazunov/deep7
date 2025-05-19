export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = {
  [K in keyof T]: T[K];
};
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]?: Maybe<T[SubKey]>;
};
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]: Maybe<T[SubKey]>;
};
export type MakeEmpty<
  T extends { [key: string]: unknown },
  K extends keyof T,
> = { [_ in K]?: never };
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends " $fragmentName" | "__typename" ? T[P] : never;
    };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  bigint: { input: any; output: any };
  jsonb: { input: any; output: any };
  numeric: { input: any; output: any };
  timestamptz: { input: any; output: any };
  uuid: { input: any; output: any };
};

/** Boolean expression to compare columns of type "Boolean". All fields are combined with logical 'AND'. */
export type Boolean_Comparison_Exp = {
  _eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  _gt?: InputMaybe<Scalars["Boolean"]["input"]>;
  _gte?: InputMaybe<Scalars["Boolean"]["input"]>;
  _in?: InputMaybe<Array<Scalars["Boolean"]["input"]>>;
  _is_null?: InputMaybe<Scalars["Boolean"]["input"]>;
  _lt?: InputMaybe<Scalars["Boolean"]["input"]>;
  _lte?: InputMaybe<Scalars["Boolean"]["input"]>;
  _neq?: InputMaybe<Scalars["Boolean"]["input"]>;
  _nin?: InputMaybe<Array<Scalars["Boolean"]["input"]>>;
};

/** Boolean expression to compare columns of type "Int". All fields are combined with logical 'AND'. */
export type Int_Comparison_Exp = {
  _eq?: InputMaybe<Scalars["Int"]["input"]>;
  _gt?: InputMaybe<Scalars["Int"]["input"]>;
  _gte?: InputMaybe<Scalars["Int"]["input"]>;
  _in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  _is_null?: InputMaybe<Scalars["Boolean"]["input"]>;
  _lt?: InputMaybe<Scalars["Int"]["input"]>;
  _lte?: InputMaybe<Scalars["Int"]["input"]>;
  _neq?: InputMaybe<Scalars["Int"]["input"]>;
  _nin?: InputMaybe<Array<Scalars["Int"]["input"]>>;
};

/** Boolean expression to compare columns of type "String". All fields are combined with logical 'AND'. */
export type String_Comparison_Exp = {
  _eq?: InputMaybe<Scalars["String"]["input"]>;
  _gt?: InputMaybe<Scalars["String"]["input"]>;
  _gte?: InputMaybe<Scalars["String"]["input"]>;
  /** does the column match the given case-insensitive pattern */
  _ilike?: InputMaybe<Scalars["String"]["input"]>;
  _in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  /** does the column match the given POSIX regular expression, case insensitive */
  _iregex?: InputMaybe<Scalars["String"]["input"]>;
  _is_null?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** does the column match the given pattern */
  _like?: InputMaybe<Scalars["String"]["input"]>;
  _lt?: InputMaybe<Scalars["String"]["input"]>;
  _lte?: InputMaybe<Scalars["String"]["input"]>;
  _neq?: InputMaybe<Scalars["String"]["input"]>;
  /** does the column NOT match the given case-insensitive pattern */
  _nilike?: InputMaybe<Scalars["String"]["input"]>;
  _nin?: InputMaybe<Array<Scalars["String"]["input"]>>;
  /** does the column NOT match the given POSIX regular expression, case insensitive */
  _niregex?: InputMaybe<Scalars["String"]["input"]>;
  /** does the column NOT match the given pattern */
  _nlike?: InputMaybe<Scalars["String"]["input"]>;
  /** does the column NOT match the given POSIX regular expression, case sensitive */
  _nregex?: InputMaybe<Scalars["String"]["input"]>;
  /** does the column NOT match the given SQL regular expression */
  _nsimilar?: InputMaybe<Scalars["String"]["input"]>;
  /** does the column match the given POSIX regular expression, case sensitive */
  _regex?: InputMaybe<Scalars["String"]["input"]>;
  /** does the column match the given SQL regular expression */
  _similar?: InputMaybe<Scalars["String"]["input"]>;
};

/** columns and relationships of "accounts" */
export type Accounts = {
  __typename?: "accounts";
  access_token?: Maybe<Scalars["String"]["output"]>;
  created_at: Scalars["timestamptz"]["output"];
  expires_at?: Maybe<Scalars["bigint"]["output"]>;
  id: Scalars["uuid"]["output"];
  id_token?: Maybe<Scalars["String"]["output"]>;
  oauth_token?: Maybe<Scalars["String"]["output"]>;
  oauth_token_secret?: Maybe<Scalars["String"]["output"]>;
  provider: Scalars["String"]["output"];
  provider_account_id: Scalars["String"]["output"];
  refresh_token?: Maybe<Scalars["String"]["output"]>;
  scope?: Maybe<Scalars["String"]["output"]>;
  session_state?: Maybe<Scalars["String"]["output"]>;
  token_type?: Maybe<Scalars["String"]["output"]>;
  type: Scalars["String"]["output"];
  /** An object relationship */
  user: Users;
  user_id: Scalars["uuid"]["output"];
};

/** aggregated selection of "accounts" */
export type Accounts_Aggregate = {
  __typename?: "accounts_aggregate";
  aggregate?: Maybe<Accounts_Aggregate_Fields>;
  nodes: Array<Accounts>;
};

export type Accounts_Aggregate_Bool_Exp = {
  count?: InputMaybe<Accounts_Aggregate_Bool_Exp_Count>;
};

export type Accounts_Aggregate_Bool_Exp_Count = {
  arguments?: InputMaybe<Array<Accounts_Select_Column>>;
  distinct?: InputMaybe<Scalars["Boolean"]["input"]>;
  filter?: InputMaybe<Accounts_Bool_Exp>;
  predicate: Int_Comparison_Exp;
};

/** aggregate fields of "accounts" */
export type Accounts_Aggregate_Fields = {
  __typename?: "accounts_aggregate_fields";
  avg?: Maybe<Accounts_Avg_Fields>;
  count: Scalars["Int"]["output"];
  max?: Maybe<Accounts_Max_Fields>;
  min?: Maybe<Accounts_Min_Fields>;
  stddev?: Maybe<Accounts_Stddev_Fields>;
  stddev_pop?: Maybe<Accounts_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Accounts_Stddev_Samp_Fields>;
  sum?: Maybe<Accounts_Sum_Fields>;
  var_pop?: Maybe<Accounts_Var_Pop_Fields>;
  var_samp?: Maybe<Accounts_Var_Samp_Fields>;
  variance?: Maybe<Accounts_Variance_Fields>;
};

/** aggregate fields of "accounts" */
export type Accounts_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Accounts_Select_Column>>;
  distinct?: InputMaybe<Scalars["Boolean"]["input"]>;
};

/** order by aggregate values of table "accounts" */
export type Accounts_Aggregate_Order_By = {
  avg?: InputMaybe<Accounts_Avg_Order_By>;
  count?: InputMaybe<Order_By>;
  max?: InputMaybe<Accounts_Max_Order_By>;
  min?: InputMaybe<Accounts_Min_Order_By>;
  stddev?: InputMaybe<Accounts_Stddev_Order_By>;
  stddev_pop?: InputMaybe<Accounts_Stddev_Pop_Order_By>;
  stddev_samp?: InputMaybe<Accounts_Stddev_Samp_Order_By>;
  sum?: InputMaybe<Accounts_Sum_Order_By>;
  var_pop?: InputMaybe<Accounts_Var_Pop_Order_By>;
  var_samp?: InputMaybe<Accounts_Var_Samp_Order_By>;
  variance?: InputMaybe<Accounts_Variance_Order_By>;
};

/** input type for inserting array relation for remote table "accounts" */
export type Accounts_Arr_Rel_Insert_Input = {
  data: Array<Accounts_Insert_Input>;
  /** upsert condition */
  on_conflict?: InputMaybe<Accounts_On_Conflict>;
};

/** aggregate avg on columns */
export type Accounts_Avg_Fields = {
  __typename?: "accounts_avg_fields";
  expires_at?: Maybe<Scalars["Float"]["output"]>;
};

/** order by avg() on columns of table "accounts" */
export type Accounts_Avg_Order_By = {
  expires_at?: InputMaybe<Order_By>;
};

/** Boolean expression to filter rows from the table "accounts". All fields are combined with a logical 'AND'. */
export type Accounts_Bool_Exp = {
  _and?: InputMaybe<Array<Accounts_Bool_Exp>>;
  _not?: InputMaybe<Accounts_Bool_Exp>;
  _or?: InputMaybe<Array<Accounts_Bool_Exp>>;
  access_token?: InputMaybe<String_Comparison_Exp>;
  created_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  expires_at?: InputMaybe<Bigint_Comparison_Exp>;
  id?: InputMaybe<Uuid_Comparison_Exp>;
  id_token?: InputMaybe<String_Comparison_Exp>;
  oauth_token?: InputMaybe<String_Comparison_Exp>;
  oauth_token_secret?: InputMaybe<String_Comparison_Exp>;
  provider?: InputMaybe<String_Comparison_Exp>;
  provider_account_id?: InputMaybe<String_Comparison_Exp>;
  refresh_token?: InputMaybe<String_Comparison_Exp>;
  scope?: InputMaybe<String_Comparison_Exp>;
  session_state?: InputMaybe<String_Comparison_Exp>;
  token_type?: InputMaybe<String_Comparison_Exp>;
  type?: InputMaybe<String_Comparison_Exp>;
  user?: InputMaybe<Users_Bool_Exp>;
  user_id?: InputMaybe<Uuid_Comparison_Exp>;
};

/** unique or primary key constraints on table "accounts" */
export enum Accounts_Constraint {
  /** unique or primary key constraint on columns "id" */
  AccountsPkey = "accounts_pkey",
  /** unique or primary key constraint on columns "provider", "provider_account_id" */
  AccountsProviderProviderAccountIdKey = "accounts_provider_provider_account_id_key",
}

/** input type for incrementing numeric columns in table "accounts" */
export type Accounts_Inc_Input = {
  expires_at?: InputMaybe<Scalars["bigint"]["input"]>;
};

/** input type for inserting data into table "accounts" */
export type Accounts_Insert_Input = {
  access_token?: InputMaybe<Scalars["String"]["input"]>;
  created_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
  expires_at?: InputMaybe<Scalars["bigint"]["input"]>;
  id?: InputMaybe<Scalars["uuid"]["input"]>;
  id_token?: InputMaybe<Scalars["String"]["input"]>;
  oauth_token?: InputMaybe<Scalars["String"]["input"]>;
  oauth_token_secret?: InputMaybe<Scalars["String"]["input"]>;
  provider?: InputMaybe<Scalars["String"]["input"]>;
  provider_account_id?: InputMaybe<Scalars["String"]["input"]>;
  refresh_token?: InputMaybe<Scalars["String"]["input"]>;
  scope?: InputMaybe<Scalars["String"]["input"]>;
  session_state?: InputMaybe<Scalars["String"]["input"]>;
  token_type?: InputMaybe<Scalars["String"]["input"]>;
  type?: InputMaybe<Scalars["String"]["input"]>;
  user?: InputMaybe<Users_Obj_Rel_Insert_Input>;
  user_id?: InputMaybe<Scalars["uuid"]["input"]>;
};

/** aggregate max on columns */
export type Accounts_Max_Fields = {
  __typename?: "accounts_max_fields";
  access_token?: Maybe<Scalars["String"]["output"]>;
  created_at?: Maybe<Scalars["timestamptz"]["output"]>;
  expires_at?: Maybe<Scalars["bigint"]["output"]>;
  id?: Maybe<Scalars["uuid"]["output"]>;
  id_token?: Maybe<Scalars["String"]["output"]>;
  oauth_token?: Maybe<Scalars["String"]["output"]>;
  oauth_token_secret?: Maybe<Scalars["String"]["output"]>;
  provider?: Maybe<Scalars["String"]["output"]>;
  provider_account_id?: Maybe<Scalars["String"]["output"]>;
  refresh_token?: Maybe<Scalars["String"]["output"]>;
  scope?: Maybe<Scalars["String"]["output"]>;
  session_state?: Maybe<Scalars["String"]["output"]>;
  token_type?: Maybe<Scalars["String"]["output"]>;
  type?: Maybe<Scalars["String"]["output"]>;
  user_id?: Maybe<Scalars["uuid"]["output"]>;
};

/** order by max() on columns of table "accounts" */
export type Accounts_Max_Order_By = {
  access_token?: InputMaybe<Order_By>;
  created_at?: InputMaybe<Order_By>;
  expires_at?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  id_token?: InputMaybe<Order_By>;
  oauth_token?: InputMaybe<Order_By>;
  oauth_token_secret?: InputMaybe<Order_By>;
  provider?: InputMaybe<Order_By>;
  provider_account_id?: InputMaybe<Order_By>;
  refresh_token?: InputMaybe<Order_By>;
  scope?: InputMaybe<Order_By>;
  session_state?: InputMaybe<Order_By>;
  token_type?: InputMaybe<Order_By>;
  type?: InputMaybe<Order_By>;
  user_id?: InputMaybe<Order_By>;
};

/** aggregate min on columns */
export type Accounts_Min_Fields = {
  __typename?: "accounts_min_fields";
  access_token?: Maybe<Scalars["String"]["output"]>;
  created_at?: Maybe<Scalars["timestamptz"]["output"]>;
  expires_at?: Maybe<Scalars["bigint"]["output"]>;
  id?: Maybe<Scalars["uuid"]["output"]>;
  id_token?: Maybe<Scalars["String"]["output"]>;
  oauth_token?: Maybe<Scalars["String"]["output"]>;
  oauth_token_secret?: Maybe<Scalars["String"]["output"]>;
  provider?: Maybe<Scalars["String"]["output"]>;
  provider_account_id?: Maybe<Scalars["String"]["output"]>;
  refresh_token?: Maybe<Scalars["String"]["output"]>;
  scope?: Maybe<Scalars["String"]["output"]>;
  session_state?: Maybe<Scalars["String"]["output"]>;
  token_type?: Maybe<Scalars["String"]["output"]>;
  type?: Maybe<Scalars["String"]["output"]>;
  user_id?: Maybe<Scalars["uuid"]["output"]>;
};

/** order by min() on columns of table "accounts" */
export type Accounts_Min_Order_By = {
  access_token?: InputMaybe<Order_By>;
  created_at?: InputMaybe<Order_By>;
  expires_at?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  id_token?: InputMaybe<Order_By>;
  oauth_token?: InputMaybe<Order_By>;
  oauth_token_secret?: InputMaybe<Order_By>;
  provider?: InputMaybe<Order_By>;
  provider_account_id?: InputMaybe<Order_By>;
  refresh_token?: InputMaybe<Order_By>;
  scope?: InputMaybe<Order_By>;
  session_state?: InputMaybe<Order_By>;
  token_type?: InputMaybe<Order_By>;
  type?: InputMaybe<Order_By>;
  user_id?: InputMaybe<Order_By>;
};

/** response of any mutation on the table "accounts" */
export type Accounts_Mutation_Response = {
  __typename?: "accounts_mutation_response";
  /** number of rows affected by the mutation */
  affected_rows: Scalars["Int"]["output"];
  /** data from the rows affected by the mutation */
  returning: Array<Accounts>;
};

/** on_conflict condition type for table "accounts" */
export type Accounts_On_Conflict = {
  constraint: Accounts_Constraint;
  update_columns?: Array<Accounts_Update_Column>;
  where?: InputMaybe<Accounts_Bool_Exp>;
};

/** Ordering options when selecting data from "accounts". */
export type Accounts_Order_By = {
  access_token?: InputMaybe<Order_By>;
  created_at?: InputMaybe<Order_By>;
  expires_at?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  id_token?: InputMaybe<Order_By>;
  oauth_token?: InputMaybe<Order_By>;
  oauth_token_secret?: InputMaybe<Order_By>;
  provider?: InputMaybe<Order_By>;
  provider_account_id?: InputMaybe<Order_By>;
  refresh_token?: InputMaybe<Order_By>;
  scope?: InputMaybe<Order_By>;
  session_state?: InputMaybe<Order_By>;
  token_type?: InputMaybe<Order_By>;
  type?: InputMaybe<Order_By>;
  user?: InputMaybe<Users_Order_By>;
  user_id?: InputMaybe<Order_By>;
};

/** primary key columns input for table: accounts */
export type Accounts_Pk_Columns_Input = {
  id: Scalars["uuid"]["input"];
};

/** select columns of table "accounts" */
export enum Accounts_Select_Column {
  /** column name */
  AccessToken = "access_token",
  /** column name */
  CreatedAt = "created_at",
  /** column name */
  ExpiresAt = "expires_at",
  /** column name */
  Id = "id",
  /** column name */
  IdToken = "id_token",
  /** column name */
  OauthToken = "oauth_token",
  /** column name */
  OauthTokenSecret = "oauth_token_secret",
  /** column name */
  Provider = "provider",
  /** column name */
  ProviderAccountId = "provider_account_id",
  /** column name */
  RefreshToken = "refresh_token",
  /** column name */
  Scope = "scope",
  /** column name */
  SessionState = "session_state",
  /** column name */
  TokenType = "token_type",
  /** column name */
  Type = "type",
  /** column name */
  UserId = "user_id",
}

/** input type for updating data in table "accounts" */
export type Accounts_Set_Input = {
  access_token?: InputMaybe<Scalars["String"]["input"]>;
  created_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
  expires_at?: InputMaybe<Scalars["bigint"]["input"]>;
  id?: InputMaybe<Scalars["uuid"]["input"]>;
  id_token?: InputMaybe<Scalars["String"]["input"]>;
  oauth_token?: InputMaybe<Scalars["String"]["input"]>;
  oauth_token_secret?: InputMaybe<Scalars["String"]["input"]>;
  provider?: InputMaybe<Scalars["String"]["input"]>;
  provider_account_id?: InputMaybe<Scalars["String"]["input"]>;
  refresh_token?: InputMaybe<Scalars["String"]["input"]>;
  scope?: InputMaybe<Scalars["String"]["input"]>;
  session_state?: InputMaybe<Scalars["String"]["input"]>;
  token_type?: InputMaybe<Scalars["String"]["input"]>;
  type?: InputMaybe<Scalars["String"]["input"]>;
  user_id?: InputMaybe<Scalars["uuid"]["input"]>;
};

/** aggregate stddev on columns */
export type Accounts_Stddev_Fields = {
  __typename?: "accounts_stddev_fields";
  expires_at?: Maybe<Scalars["Float"]["output"]>;
};

/** order by stddev() on columns of table "accounts" */
export type Accounts_Stddev_Order_By = {
  expires_at?: InputMaybe<Order_By>;
};

/** aggregate stddev_pop on columns */
export type Accounts_Stddev_Pop_Fields = {
  __typename?: "accounts_stddev_pop_fields";
  expires_at?: Maybe<Scalars["Float"]["output"]>;
};

/** order by stddev_pop() on columns of table "accounts" */
export type Accounts_Stddev_Pop_Order_By = {
  expires_at?: InputMaybe<Order_By>;
};

/** aggregate stddev_samp on columns */
export type Accounts_Stddev_Samp_Fields = {
  __typename?: "accounts_stddev_samp_fields";
  expires_at?: Maybe<Scalars["Float"]["output"]>;
};

/** order by stddev_samp() on columns of table "accounts" */
export type Accounts_Stddev_Samp_Order_By = {
  expires_at?: InputMaybe<Order_By>;
};

/** Streaming cursor of the table "accounts" */
export type Accounts_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Accounts_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Accounts_Stream_Cursor_Value_Input = {
  access_token?: InputMaybe<Scalars["String"]["input"]>;
  created_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
  expires_at?: InputMaybe<Scalars["bigint"]["input"]>;
  id?: InputMaybe<Scalars["uuid"]["input"]>;
  id_token?: InputMaybe<Scalars["String"]["input"]>;
  oauth_token?: InputMaybe<Scalars["String"]["input"]>;
  oauth_token_secret?: InputMaybe<Scalars["String"]["input"]>;
  provider?: InputMaybe<Scalars["String"]["input"]>;
  provider_account_id?: InputMaybe<Scalars["String"]["input"]>;
  refresh_token?: InputMaybe<Scalars["String"]["input"]>;
  scope?: InputMaybe<Scalars["String"]["input"]>;
  session_state?: InputMaybe<Scalars["String"]["input"]>;
  token_type?: InputMaybe<Scalars["String"]["input"]>;
  type?: InputMaybe<Scalars["String"]["input"]>;
  user_id?: InputMaybe<Scalars["uuid"]["input"]>;
};

/** aggregate sum on columns */
export type Accounts_Sum_Fields = {
  __typename?: "accounts_sum_fields";
  expires_at?: Maybe<Scalars["bigint"]["output"]>;
};

/** order by sum() on columns of table "accounts" */
export type Accounts_Sum_Order_By = {
  expires_at?: InputMaybe<Order_By>;
};

/** update columns of table "accounts" */
export enum Accounts_Update_Column {
  /** column name */
  AccessToken = "access_token",
  /** column name */
  CreatedAt = "created_at",
  /** column name */
  ExpiresAt = "expires_at",
  /** column name */
  Id = "id",
  /** column name */
  IdToken = "id_token",
  /** column name */
  OauthToken = "oauth_token",
  /** column name */
  OauthTokenSecret = "oauth_token_secret",
  /** column name */
  Provider = "provider",
  /** column name */
  ProviderAccountId = "provider_account_id",
  /** column name */
  RefreshToken = "refresh_token",
  /** column name */
  Scope = "scope",
  /** column name */
  SessionState = "session_state",
  /** column name */
  TokenType = "token_type",
  /** column name */
  Type = "type",
  /** column name */
  UserId = "user_id",
}

export type Accounts_Updates = {
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<Accounts_Inc_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Accounts_Set_Input>;
  /** filter the rows which have to be updated */
  where: Accounts_Bool_Exp;
};

/** aggregate var_pop on columns */
export type Accounts_Var_Pop_Fields = {
  __typename?: "accounts_var_pop_fields";
  expires_at?: Maybe<Scalars["Float"]["output"]>;
};

/** order by var_pop() on columns of table "accounts" */
export type Accounts_Var_Pop_Order_By = {
  expires_at?: InputMaybe<Order_By>;
};

/** aggregate var_samp on columns */
export type Accounts_Var_Samp_Fields = {
  __typename?: "accounts_var_samp_fields";
  expires_at?: Maybe<Scalars["Float"]["output"]>;
};

/** order by var_samp() on columns of table "accounts" */
export type Accounts_Var_Samp_Order_By = {
  expires_at?: InputMaybe<Order_By>;
};

/** aggregate variance on columns */
export type Accounts_Variance_Fields = {
  __typename?: "accounts_variance_fields";
  expires_at?: Maybe<Scalars["Float"]["output"]>;
};

/** order by variance() on columns of table "accounts" */
export type Accounts_Variance_Order_By = {
  expires_at?: InputMaybe<Order_By>;
};

/** Boolean expression to compare columns of type "bigint". All fields are combined with logical 'AND'. */
export type Bigint_Comparison_Exp = {
  _eq?: InputMaybe<Scalars["bigint"]["input"]>;
  _gt?: InputMaybe<Scalars["bigint"]["input"]>;
  _gte?: InputMaybe<Scalars["bigint"]["input"]>;
  _in?: InputMaybe<Array<Scalars["bigint"]["input"]>>;
  _is_null?: InputMaybe<Scalars["Boolean"]["input"]>;
  _lt?: InputMaybe<Scalars["bigint"]["input"]>;
  _lte?: InputMaybe<Scalars["bigint"]["input"]>;
  _neq?: InputMaybe<Scalars["bigint"]["input"]>;
  _nin?: InputMaybe<Array<Scalars["bigint"]["input"]>>;
};

/** ordering argument of a cursor */
export enum Cursor_Ordering {
  /** ascending ordering of the cursor */
  Asc = "ASC",
  /** descending ordering of the cursor */
  Desc = "DESC",
}

/** columns and relationships of "debug" */
export type Debug = {
  __typename?: "debug";
  created_at: Scalars["timestamptz"]["output"];
  id: Scalars["uuid"]["output"];
  value?: Maybe<Scalars["jsonb"]["output"]>;
};

/** columns and relationships of "debug" */
export type DebugValueArgs = {
  path?: InputMaybe<Scalars["String"]["input"]>;
};

/** aggregated selection of "debug" */
export type Debug_Aggregate = {
  __typename?: "debug_aggregate";
  aggregate?: Maybe<Debug_Aggregate_Fields>;
  nodes: Array<Debug>;
};

/** aggregate fields of "debug" */
export type Debug_Aggregate_Fields = {
  __typename?: "debug_aggregate_fields";
  count: Scalars["Int"]["output"];
  max?: Maybe<Debug_Max_Fields>;
  min?: Maybe<Debug_Min_Fields>;
};

/** aggregate fields of "debug" */
export type Debug_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Debug_Select_Column>>;
  distinct?: InputMaybe<Scalars["Boolean"]["input"]>;
};

/** append existing jsonb value of filtered columns with new jsonb value */
export type Debug_Append_Input = {
  value?: InputMaybe<Scalars["jsonb"]["input"]>;
};

/** Boolean expression to filter rows from the table "debug". All fields are combined with a logical 'AND'. */
export type Debug_Bool_Exp = {
  _and?: InputMaybe<Array<Debug_Bool_Exp>>;
  _not?: InputMaybe<Debug_Bool_Exp>;
  _or?: InputMaybe<Array<Debug_Bool_Exp>>;
  created_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  id?: InputMaybe<Uuid_Comparison_Exp>;
  value?: InputMaybe<Jsonb_Comparison_Exp>;
};

/** unique or primary key constraints on table "debug" */
export enum Debug_Constraint {
  /** unique or primary key constraint on columns "id" */
  DebugPkey = "debug_pkey",
}

/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
export type Debug_Delete_At_Path_Input = {
  value?: InputMaybe<Array<Scalars["String"]["input"]>>;
};

/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
export type Debug_Delete_Elem_Input = {
  value?: InputMaybe<Scalars["Int"]["input"]>;
};

/** delete key/value pair or string element. key/value pairs are matched based on their key value */
export type Debug_Delete_Key_Input = {
  value?: InputMaybe<Scalars["String"]["input"]>;
};

/** input type for inserting data into table "debug" */
export type Debug_Insert_Input = {
  created_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
  id?: InputMaybe<Scalars["uuid"]["input"]>;
  value?: InputMaybe<Scalars["jsonb"]["input"]>;
};

/** aggregate max on columns */
export type Debug_Max_Fields = {
  __typename?: "debug_max_fields";
  created_at?: Maybe<Scalars["timestamptz"]["output"]>;
  id?: Maybe<Scalars["uuid"]["output"]>;
};

/** aggregate min on columns */
export type Debug_Min_Fields = {
  __typename?: "debug_min_fields";
  created_at?: Maybe<Scalars["timestamptz"]["output"]>;
  id?: Maybe<Scalars["uuid"]["output"]>;
};

/** response of any mutation on the table "debug" */
export type Debug_Mutation_Response = {
  __typename?: "debug_mutation_response";
  /** number of rows affected by the mutation */
  affected_rows: Scalars["Int"]["output"];
  /** data from the rows affected by the mutation */
  returning: Array<Debug>;
};

/** on_conflict condition type for table "debug" */
export type Debug_On_Conflict = {
  constraint: Debug_Constraint;
  update_columns?: Array<Debug_Update_Column>;
  where?: InputMaybe<Debug_Bool_Exp>;
};

/** Ordering options when selecting data from "debug". */
export type Debug_Order_By = {
  created_at?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  value?: InputMaybe<Order_By>;
};

/** primary key columns input for table: debug */
export type Debug_Pk_Columns_Input = {
  id: Scalars["uuid"]["input"];
};

/** prepend existing jsonb value of filtered columns with new jsonb value */
export type Debug_Prepend_Input = {
  value?: InputMaybe<Scalars["jsonb"]["input"]>;
};

/** select columns of table "debug" */
export enum Debug_Select_Column {
  /** column name */
  CreatedAt = "created_at",
  /** column name */
  Id = "id",
  /** column name */
  Value = "value",
}

/** input type for updating data in table "debug" */
export type Debug_Set_Input = {
  created_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
  id?: InputMaybe<Scalars["uuid"]["input"]>;
  value?: InputMaybe<Scalars["jsonb"]["input"]>;
};

/** Streaming cursor of the table "debug" */
export type Debug_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Debug_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Debug_Stream_Cursor_Value_Input = {
  created_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
  id?: InputMaybe<Scalars["uuid"]["input"]>;
  value?: InputMaybe<Scalars["jsonb"]["input"]>;
};

/** update columns of table "debug" */
export enum Debug_Update_Column {
  /** column name */
  CreatedAt = "created_at",
  /** column name */
  Id = "id",
  /** column name */
  Value = "value",
}

export type Debug_Updates = {
  /** append existing jsonb value of filtered columns with new jsonb value */
  _append?: InputMaybe<Debug_Append_Input>;
  /** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
  _delete_at_path?: InputMaybe<Debug_Delete_At_Path_Input>;
  /** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
  _delete_elem?: InputMaybe<Debug_Delete_Elem_Input>;
  /** delete key/value pair or string element. key/value pairs are matched based on their key value */
  _delete_key?: InputMaybe<Debug_Delete_Key_Input>;
  /** prepend existing jsonb value of filtered columns with new jsonb value */
  _prepend?: InputMaybe<Debug_Prepend_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Debug_Set_Input>;
  /** filter the rows which have to be updated */
  where: Debug_Bool_Exp;
};

/** columns and relationships of "deep.functions" */
export type Deep_Functions = {
  __typename?: "deep_functions";
  _data: Scalars["jsonb"]["output"];
  created_at: Scalars["timestamptz"]["output"];
  id: Scalars["uuid"]["output"];
  /** An object relationship */
  link: Deep_Links;
  updated_at: Scalars["timestamptz"]["output"];
};

/** columns and relationships of "deep.functions" */
export type Deep_Functions_DataArgs = {
  path?: InputMaybe<Scalars["String"]["input"]>;
};

/** aggregated selection of "deep.functions" */
export type Deep_Functions_Aggregate = {
  __typename?: "deep_functions_aggregate";
  aggregate?: Maybe<Deep_Functions_Aggregate_Fields>;
  nodes: Array<Deep_Functions>;
};

export type Deep_Functions_Aggregate_Bool_Exp = {
  count?: InputMaybe<Deep_Functions_Aggregate_Bool_Exp_Count>;
};

export type Deep_Functions_Aggregate_Bool_Exp_Count = {
  arguments?: InputMaybe<Array<Deep_Functions_Select_Column>>;
  distinct?: InputMaybe<Scalars["Boolean"]["input"]>;
  filter?: InputMaybe<Deep_Functions_Bool_Exp>;
  predicate: Int_Comparison_Exp;
};

/** aggregate fields of "deep.functions" */
export type Deep_Functions_Aggregate_Fields = {
  __typename?: "deep_functions_aggregate_fields";
  count: Scalars["Int"]["output"];
  max?: Maybe<Deep_Functions_Max_Fields>;
  min?: Maybe<Deep_Functions_Min_Fields>;
};

/** aggregate fields of "deep.functions" */
export type Deep_Functions_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Deep_Functions_Select_Column>>;
  distinct?: InputMaybe<Scalars["Boolean"]["input"]>;
};

/** order by aggregate values of table "deep.functions" */
export type Deep_Functions_Aggregate_Order_By = {
  count?: InputMaybe<Order_By>;
  max?: InputMaybe<Deep_Functions_Max_Order_By>;
  min?: InputMaybe<Deep_Functions_Min_Order_By>;
};

/** append existing jsonb value of filtered columns with new jsonb value */
export type Deep_Functions_Append_Input = {
  _data?: InputMaybe<Scalars["jsonb"]["input"]>;
};

/** input type for inserting array relation for remote table "deep.functions" */
export type Deep_Functions_Arr_Rel_Insert_Input = {
  data: Array<Deep_Functions_Insert_Input>;
  /** upsert condition */
  on_conflict?: InputMaybe<Deep_Functions_On_Conflict>;
};

/** Boolean expression to filter rows from the table "deep.functions". All fields are combined with a logical 'AND'. */
export type Deep_Functions_Bool_Exp = {
  _and?: InputMaybe<Array<Deep_Functions_Bool_Exp>>;
  _data?: InputMaybe<Jsonb_Comparison_Exp>;
  _not?: InputMaybe<Deep_Functions_Bool_Exp>;
  _or?: InputMaybe<Array<Deep_Functions_Bool_Exp>>;
  created_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  id?: InputMaybe<Uuid_Comparison_Exp>;
  link?: InputMaybe<Deep_Links_Bool_Exp>;
  updated_at?: InputMaybe<Timestamptz_Comparison_Exp>;
};

/** unique or primary key constraints on table "deep.functions" */
export enum Deep_Functions_Constraint {
  /** unique or primary key constraint on columns "id" */
  FunctionsPkey = "functions_pkey",
}

/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
export type Deep_Functions_Delete_At_Path_Input = {
  _data?: InputMaybe<Array<Scalars["String"]["input"]>>;
};

/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
export type Deep_Functions_Delete_Elem_Input = {
  _data?: InputMaybe<Scalars["Int"]["input"]>;
};

/** delete key/value pair or string element. key/value pairs are matched based on their key value */
export type Deep_Functions_Delete_Key_Input = {
  _data?: InputMaybe<Scalars["String"]["input"]>;
};

/** input type for inserting data into table "deep.functions" */
export type Deep_Functions_Insert_Input = {
  _data?: InputMaybe<Scalars["jsonb"]["input"]>;
  created_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
  id?: InputMaybe<Scalars["uuid"]["input"]>;
  link?: InputMaybe<Deep_Links_Obj_Rel_Insert_Input>;
  updated_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
};

/** aggregate max on columns */
export type Deep_Functions_Max_Fields = {
  __typename?: "deep_functions_max_fields";
  created_at?: Maybe<Scalars["timestamptz"]["output"]>;
  id?: Maybe<Scalars["uuid"]["output"]>;
  updated_at?: Maybe<Scalars["timestamptz"]["output"]>;
};

/** order by max() on columns of table "deep.functions" */
export type Deep_Functions_Max_Order_By = {
  created_at?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
};

/** aggregate min on columns */
export type Deep_Functions_Min_Fields = {
  __typename?: "deep_functions_min_fields";
  created_at?: Maybe<Scalars["timestamptz"]["output"]>;
  id?: Maybe<Scalars["uuid"]["output"]>;
  updated_at?: Maybe<Scalars["timestamptz"]["output"]>;
};

/** order by min() on columns of table "deep.functions" */
export type Deep_Functions_Min_Order_By = {
  created_at?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
};

/** response of any mutation on the table "deep.functions" */
export type Deep_Functions_Mutation_Response = {
  __typename?: "deep_functions_mutation_response";
  /** number of rows affected by the mutation */
  affected_rows: Scalars["Int"]["output"];
  /** data from the rows affected by the mutation */
  returning: Array<Deep_Functions>;
};

/** on_conflict condition type for table "deep.functions" */
export type Deep_Functions_On_Conflict = {
  constraint: Deep_Functions_Constraint;
  update_columns?: Array<Deep_Functions_Update_Column>;
  where?: InputMaybe<Deep_Functions_Bool_Exp>;
};

/** Ordering options when selecting data from "deep.functions". */
export type Deep_Functions_Order_By = {
  _data?: InputMaybe<Order_By>;
  created_at?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  link?: InputMaybe<Deep_Links_Order_By>;
  updated_at?: InputMaybe<Order_By>;
};

/** primary key columns input for table: deep.functions */
export type Deep_Functions_Pk_Columns_Input = {
  id: Scalars["uuid"]["input"];
};

/** prepend existing jsonb value of filtered columns with new jsonb value */
export type Deep_Functions_Prepend_Input = {
  _data?: InputMaybe<Scalars["jsonb"]["input"]>;
};

/** select columns of table "deep.functions" */
export enum Deep_Functions_Select_Column {
  /** column name */
  Data = "_data",
  /** column name */
  CreatedAt = "created_at",
  /** column name */
  Id = "id",
  /** column name */
  UpdatedAt = "updated_at",
}

/** input type for updating data in table "deep.functions" */
export type Deep_Functions_Set_Input = {
  _data?: InputMaybe<Scalars["jsonb"]["input"]>;
  created_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
  id?: InputMaybe<Scalars["uuid"]["input"]>;
  updated_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
};

/** Streaming cursor of the table "deep_functions" */
export type Deep_Functions_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Deep_Functions_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Deep_Functions_Stream_Cursor_Value_Input = {
  _data?: InputMaybe<Scalars["jsonb"]["input"]>;
  created_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
  id?: InputMaybe<Scalars["uuid"]["input"]>;
  updated_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
};

/** update columns of table "deep.functions" */
export enum Deep_Functions_Update_Column {
  /** column name */
  Data = "_data",
  /** column name */
  CreatedAt = "created_at",
  /** column name */
  Id = "id",
  /** column name */
  UpdatedAt = "updated_at",
}

export type Deep_Functions_Updates = {
  /** append existing jsonb value of filtered columns with new jsonb value */
  _append?: InputMaybe<Deep_Functions_Append_Input>;
  /** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
  _delete_at_path?: InputMaybe<Deep_Functions_Delete_At_Path_Input>;
  /** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
  _delete_elem?: InputMaybe<Deep_Functions_Delete_Elem_Input>;
  /** delete key/value pair or string element. key/value pairs are matched based on their key value */
  _delete_key?: InputMaybe<Deep_Functions_Delete_Key_Input>;
  /** prepend existing jsonb value of filtered columns with new jsonb value */
  _prepend?: InputMaybe<Deep_Functions_Prepend_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Deep_Functions_Set_Input>;
  /** filter the rows which have to be updated */
  where: Deep_Functions_Bool_Exp;
};

/** columns and relationships of "deep.links" */
export type Deep_Links = {
  __typename?: "deep_links";
  _from?: Maybe<Scalars["uuid"]["output"]>;
  _to?: Maybe<Scalars["uuid"]["output"]>;
  _type?: Maybe<Scalars["uuid"]["output"]>;
  _value?: Maybe<Scalars["uuid"]["output"]>;
  created_at: Scalars["timestamptz"]["output"];
  /** An object relationship */
  from?: Maybe<Deep_Links>;
  /** An array relationship */
  function: Array<Deep_Functions>;
  /** An aggregate relationship */
  function_aggregate: Deep_Functions_Aggregate;
  id: Scalars["uuid"]["output"];
  /** An array relationship */
  in: Array<Deep_Links>;
  /** An aggregate relationship */
  in_aggregate: Deep_Links_Aggregate;
  /** An array relationship */
  number: Array<Deep_Numbers>;
  /** An aggregate relationship */
  number_aggregate: Deep_Numbers_Aggregate;
  /** An array relationship */
  out: Array<Deep_Links>;
  /** An aggregate relationship */
  out_aggregate: Deep_Links_Aggregate;
  /** An array relationship */
  string: Array<Deep_Strings>;
  /** An aggregate relationship */
  string_aggregate: Deep_Strings_Aggregate;
  /** An object relationship */
  to?: Maybe<Deep_Links>;
  /** An object relationship */
  type?: Maybe<Deep_Links>;
  /** An array relationship */
  typed: Array<Deep_Links>;
  /** An aggregate relationship */
  typed_aggregate: Deep_Links_Aggregate;
  updated_at: Scalars["timestamptz"]["output"];
  /** An object relationship */
  value?: Maybe<Deep_Links>;
  /** An array relationship */
  valued: Array<Deep_Links>;
  /** An aggregate relationship */
  valued_aggregate: Deep_Links_Aggregate;
};

/** columns and relationships of "deep.links" */
export type Deep_LinksFunctionArgs = {
  distinct_on?: InputMaybe<Array<Deep_Functions_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Deep_Functions_Order_By>>;
  where?: InputMaybe<Deep_Functions_Bool_Exp>;
};

/** columns and relationships of "deep.links" */
export type Deep_LinksFunction_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Deep_Functions_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Deep_Functions_Order_By>>;
  where?: InputMaybe<Deep_Functions_Bool_Exp>;
};

/** columns and relationships of "deep.links" */
export type Deep_LinksInArgs = {
  distinct_on?: InputMaybe<Array<Deep_Links_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Deep_Links_Order_By>>;
  where?: InputMaybe<Deep_Links_Bool_Exp>;
};

/** columns and relationships of "deep.links" */
export type Deep_LinksIn_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Deep_Links_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Deep_Links_Order_By>>;
  where?: InputMaybe<Deep_Links_Bool_Exp>;
};

/** columns and relationships of "deep.links" */
export type Deep_LinksNumberArgs = {
  distinct_on?: InputMaybe<Array<Deep_Numbers_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Deep_Numbers_Order_By>>;
  where?: InputMaybe<Deep_Numbers_Bool_Exp>;
};

/** columns and relationships of "deep.links" */
export type Deep_LinksNumber_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Deep_Numbers_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Deep_Numbers_Order_By>>;
  where?: InputMaybe<Deep_Numbers_Bool_Exp>;
};

/** columns and relationships of "deep.links" */
export type Deep_LinksOutArgs = {
  distinct_on?: InputMaybe<Array<Deep_Links_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Deep_Links_Order_By>>;
  where?: InputMaybe<Deep_Links_Bool_Exp>;
};

/** columns and relationships of "deep.links" */
export type Deep_LinksOut_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Deep_Links_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Deep_Links_Order_By>>;
  where?: InputMaybe<Deep_Links_Bool_Exp>;
};

/** columns and relationships of "deep.links" */
export type Deep_LinksStringArgs = {
  distinct_on?: InputMaybe<Array<Deep_Strings_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Deep_Strings_Order_By>>;
  where?: InputMaybe<Deep_Strings_Bool_Exp>;
};

/** columns and relationships of "deep.links" */
export type Deep_LinksString_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Deep_Strings_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Deep_Strings_Order_By>>;
  where?: InputMaybe<Deep_Strings_Bool_Exp>;
};

/** columns and relationships of "deep.links" */
export type Deep_LinksTypedArgs = {
  distinct_on?: InputMaybe<Array<Deep_Links_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Deep_Links_Order_By>>;
  where?: InputMaybe<Deep_Links_Bool_Exp>;
};

/** columns and relationships of "deep.links" */
export type Deep_LinksTyped_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Deep_Links_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Deep_Links_Order_By>>;
  where?: InputMaybe<Deep_Links_Bool_Exp>;
};

/** columns and relationships of "deep.links" */
export type Deep_LinksValuedArgs = {
  distinct_on?: InputMaybe<Array<Deep_Links_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Deep_Links_Order_By>>;
  where?: InputMaybe<Deep_Links_Bool_Exp>;
};

/** columns and relationships of "deep.links" */
export type Deep_LinksValued_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Deep_Links_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Deep_Links_Order_By>>;
  where?: InputMaybe<Deep_Links_Bool_Exp>;
};

/** aggregated selection of "deep.links" */
export type Deep_Links_Aggregate = {
  __typename?: "deep_links_aggregate";
  aggregate?: Maybe<Deep_Links_Aggregate_Fields>;
  nodes: Array<Deep_Links>;
};

export type Deep_Links_Aggregate_Bool_Exp = {
  count?: InputMaybe<Deep_Links_Aggregate_Bool_Exp_Count>;
};

export type Deep_Links_Aggregate_Bool_Exp_Count = {
  arguments?: InputMaybe<Array<Deep_Links_Select_Column>>;
  distinct?: InputMaybe<Scalars["Boolean"]["input"]>;
  filter?: InputMaybe<Deep_Links_Bool_Exp>;
  predicate: Int_Comparison_Exp;
};

/** aggregate fields of "deep.links" */
export type Deep_Links_Aggregate_Fields = {
  __typename?: "deep_links_aggregate_fields";
  count: Scalars["Int"]["output"];
  max?: Maybe<Deep_Links_Max_Fields>;
  min?: Maybe<Deep_Links_Min_Fields>;
};

/** aggregate fields of "deep.links" */
export type Deep_Links_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Deep_Links_Select_Column>>;
  distinct?: InputMaybe<Scalars["Boolean"]["input"]>;
};

/** order by aggregate values of table "deep.links" */
export type Deep_Links_Aggregate_Order_By = {
  count?: InputMaybe<Order_By>;
  max?: InputMaybe<Deep_Links_Max_Order_By>;
  min?: InputMaybe<Deep_Links_Min_Order_By>;
};

/** input type for inserting array relation for remote table "deep.links" */
export type Deep_Links_Arr_Rel_Insert_Input = {
  data: Array<Deep_Links_Insert_Input>;
  /** upsert condition */
  on_conflict?: InputMaybe<Deep_Links_On_Conflict>;
};

/** Boolean expression to filter rows from the table "deep.links". All fields are combined with a logical 'AND'. */
export type Deep_Links_Bool_Exp = {
  _and?: InputMaybe<Array<Deep_Links_Bool_Exp>>;
  _from?: InputMaybe<Uuid_Comparison_Exp>;
  _not?: InputMaybe<Deep_Links_Bool_Exp>;
  _or?: InputMaybe<Array<Deep_Links_Bool_Exp>>;
  _to?: InputMaybe<Uuid_Comparison_Exp>;
  _type?: InputMaybe<Uuid_Comparison_Exp>;
  _value?: InputMaybe<Uuid_Comparison_Exp>;
  created_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  from?: InputMaybe<Deep_Links_Bool_Exp>;
  function?: InputMaybe<Deep_Functions_Bool_Exp>;
  function_aggregate?: InputMaybe<Deep_Functions_Aggregate_Bool_Exp>;
  id?: InputMaybe<Uuid_Comparison_Exp>;
  in?: InputMaybe<Deep_Links_Bool_Exp>;
  in_aggregate?: InputMaybe<Deep_Links_Aggregate_Bool_Exp>;
  number?: InputMaybe<Deep_Numbers_Bool_Exp>;
  number_aggregate?: InputMaybe<Deep_Numbers_Aggregate_Bool_Exp>;
  out?: InputMaybe<Deep_Links_Bool_Exp>;
  out_aggregate?: InputMaybe<Deep_Links_Aggregate_Bool_Exp>;
  string?: InputMaybe<Deep_Strings_Bool_Exp>;
  string_aggregate?: InputMaybe<Deep_Strings_Aggregate_Bool_Exp>;
  to?: InputMaybe<Deep_Links_Bool_Exp>;
  type?: InputMaybe<Deep_Links_Bool_Exp>;
  typed?: InputMaybe<Deep_Links_Bool_Exp>;
  typed_aggregate?: InputMaybe<Deep_Links_Aggregate_Bool_Exp>;
  updated_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  value?: InputMaybe<Deep_Links_Bool_Exp>;
  valued?: InputMaybe<Deep_Links_Bool_Exp>;
  valued_aggregate?: InputMaybe<Deep_Links_Aggregate_Bool_Exp>;
};

/** unique or primary key constraints on table "deep.links" */
export enum Deep_Links_Constraint {
  /** unique or primary key constraint on columns "id" */
  LinksPkey = "links_pkey",
}

/** input type for inserting data into table "deep.links" */
export type Deep_Links_Insert_Input = {
  _from?: InputMaybe<Scalars["uuid"]["input"]>;
  _to?: InputMaybe<Scalars["uuid"]["input"]>;
  _type?: InputMaybe<Scalars["uuid"]["input"]>;
  _value?: InputMaybe<Scalars["uuid"]["input"]>;
  created_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
  from?: InputMaybe<Deep_Links_Obj_Rel_Insert_Input>;
  function?: InputMaybe<Deep_Functions_Arr_Rel_Insert_Input>;
  id?: InputMaybe<Scalars["uuid"]["input"]>;
  in?: InputMaybe<Deep_Links_Arr_Rel_Insert_Input>;
  number?: InputMaybe<Deep_Numbers_Arr_Rel_Insert_Input>;
  out?: InputMaybe<Deep_Links_Arr_Rel_Insert_Input>;
  string?: InputMaybe<Deep_Strings_Arr_Rel_Insert_Input>;
  to?: InputMaybe<Deep_Links_Obj_Rel_Insert_Input>;
  type?: InputMaybe<Deep_Links_Obj_Rel_Insert_Input>;
  typed?: InputMaybe<Deep_Links_Arr_Rel_Insert_Input>;
  updated_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
  value?: InputMaybe<Deep_Links_Obj_Rel_Insert_Input>;
  valued?: InputMaybe<Deep_Links_Arr_Rel_Insert_Input>;
};

/** aggregate max on columns */
export type Deep_Links_Max_Fields = {
  __typename?: "deep_links_max_fields";
  _from?: Maybe<Scalars["uuid"]["output"]>;
  _to?: Maybe<Scalars["uuid"]["output"]>;
  _type?: Maybe<Scalars["uuid"]["output"]>;
  _value?: Maybe<Scalars["uuid"]["output"]>;
  created_at?: Maybe<Scalars["timestamptz"]["output"]>;
  id?: Maybe<Scalars["uuid"]["output"]>;
  updated_at?: Maybe<Scalars["timestamptz"]["output"]>;
};

/** order by max() on columns of table "deep.links" */
export type Deep_Links_Max_Order_By = {
  _from?: InputMaybe<Order_By>;
  _to?: InputMaybe<Order_By>;
  _type?: InputMaybe<Order_By>;
  _value?: InputMaybe<Order_By>;
  created_at?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
};

/** aggregate min on columns */
export type Deep_Links_Min_Fields = {
  __typename?: "deep_links_min_fields";
  _from?: Maybe<Scalars["uuid"]["output"]>;
  _to?: Maybe<Scalars["uuid"]["output"]>;
  _type?: Maybe<Scalars["uuid"]["output"]>;
  _value?: Maybe<Scalars["uuid"]["output"]>;
  created_at?: Maybe<Scalars["timestamptz"]["output"]>;
  id?: Maybe<Scalars["uuid"]["output"]>;
  updated_at?: Maybe<Scalars["timestamptz"]["output"]>;
};

/** order by min() on columns of table "deep.links" */
export type Deep_Links_Min_Order_By = {
  _from?: InputMaybe<Order_By>;
  _to?: InputMaybe<Order_By>;
  _type?: InputMaybe<Order_By>;
  _value?: InputMaybe<Order_By>;
  created_at?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
};

/** response of any mutation on the table "deep.links" */
export type Deep_Links_Mutation_Response = {
  __typename?: "deep_links_mutation_response";
  /** number of rows affected by the mutation */
  affected_rows: Scalars["Int"]["output"];
  /** data from the rows affected by the mutation */
  returning: Array<Deep_Links>;
};

/** input type for inserting object relation for remote table "deep.links" */
export type Deep_Links_Obj_Rel_Insert_Input = {
  data: Deep_Links_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<Deep_Links_On_Conflict>;
};

/** on_conflict condition type for table "deep.links" */
export type Deep_Links_On_Conflict = {
  constraint: Deep_Links_Constraint;
  update_columns?: Array<Deep_Links_Update_Column>;
  where?: InputMaybe<Deep_Links_Bool_Exp>;
};

/** Ordering options when selecting data from "deep.links". */
export type Deep_Links_Order_By = {
  _from?: InputMaybe<Order_By>;
  _to?: InputMaybe<Order_By>;
  _type?: InputMaybe<Order_By>;
  _value?: InputMaybe<Order_By>;
  created_at?: InputMaybe<Order_By>;
  from?: InputMaybe<Deep_Links_Order_By>;
  function_aggregate?: InputMaybe<Deep_Functions_Aggregate_Order_By>;
  id?: InputMaybe<Order_By>;
  in_aggregate?: InputMaybe<Deep_Links_Aggregate_Order_By>;
  number_aggregate?: InputMaybe<Deep_Numbers_Aggregate_Order_By>;
  out_aggregate?: InputMaybe<Deep_Links_Aggregate_Order_By>;
  string_aggregate?: InputMaybe<Deep_Strings_Aggregate_Order_By>;
  to?: InputMaybe<Deep_Links_Order_By>;
  type?: InputMaybe<Deep_Links_Order_By>;
  typed_aggregate?: InputMaybe<Deep_Links_Aggregate_Order_By>;
  updated_at?: InputMaybe<Order_By>;
  value?: InputMaybe<Deep_Links_Order_By>;
  valued_aggregate?: InputMaybe<Deep_Links_Aggregate_Order_By>;
};

/** primary key columns input for table: deep.links */
export type Deep_Links_Pk_Columns_Input = {
  id: Scalars["uuid"]["input"];
};

/** select columns of table "deep.links" */
export enum Deep_Links_Select_Column {
  /** column name */
  From = "_from",
  /** column name */
  To = "_to",
  /** column name */
  Type = "_type",
  /** column name */
  Value = "_value",
  /** column name */
  CreatedAt = "created_at",
  /** column name */
  Id = "id",
  /** column name */
  UpdatedAt = "updated_at",
}

/** input type for updating data in table "deep.links" */
export type Deep_Links_Set_Input = {
  _from?: InputMaybe<Scalars["uuid"]["input"]>;
  _to?: InputMaybe<Scalars["uuid"]["input"]>;
  _type?: InputMaybe<Scalars["uuid"]["input"]>;
  _value?: InputMaybe<Scalars["uuid"]["input"]>;
  created_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
  id?: InputMaybe<Scalars["uuid"]["input"]>;
  updated_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
};

/** Streaming cursor of the table "deep_links" */
export type Deep_Links_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Deep_Links_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Deep_Links_Stream_Cursor_Value_Input = {
  _from?: InputMaybe<Scalars["uuid"]["input"]>;
  _to?: InputMaybe<Scalars["uuid"]["input"]>;
  _type?: InputMaybe<Scalars["uuid"]["input"]>;
  _value?: InputMaybe<Scalars["uuid"]["input"]>;
  created_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
  id?: InputMaybe<Scalars["uuid"]["input"]>;
  updated_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
};

/** update columns of table "deep.links" */
export enum Deep_Links_Update_Column {
  /** column name */
  From = "_from",
  /** column name */
  To = "_to",
  /** column name */
  Type = "_type",
  /** column name */
  Value = "_value",
  /** column name */
  CreatedAt = "created_at",
  /** column name */
  Id = "id",
  /** column name */
  UpdatedAt = "updated_at",
}

export type Deep_Links_Updates = {
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Deep_Links_Set_Input>;
  /** filter the rows which have to be updated */
  where: Deep_Links_Bool_Exp;
};

/** columns and relationships of "deep.numbers" */
export type Deep_Numbers = {
  __typename?: "deep_numbers";
  _data: Scalars["numeric"]["output"];
  created_at: Scalars["timestamptz"]["output"];
  id: Scalars["uuid"]["output"];
  /** An object relationship */
  link: Deep_Links;
  updated_at: Scalars["timestamptz"]["output"];
};

/** aggregated selection of "deep.numbers" */
export type Deep_Numbers_Aggregate = {
  __typename?: "deep_numbers_aggregate";
  aggregate?: Maybe<Deep_Numbers_Aggregate_Fields>;
  nodes: Array<Deep_Numbers>;
};

export type Deep_Numbers_Aggregate_Bool_Exp = {
  count?: InputMaybe<Deep_Numbers_Aggregate_Bool_Exp_Count>;
};

export type Deep_Numbers_Aggregate_Bool_Exp_Count = {
  arguments?: InputMaybe<Array<Deep_Numbers_Select_Column>>;
  distinct?: InputMaybe<Scalars["Boolean"]["input"]>;
  filter?: InputMaybe<Deep_Numbers_Bool_Exp>;
  predicate: Int_Comparison_Exp;
};

/** aggregate fields of "deep.numbers" */
export type Deep_Numbers_Aggregate_Fields = {
  __typename?: "deep_numbers_aggregate_fields";
  avg?: Maybe<Deep_Numbers_Avg_Fields>;
  count: Scalars["Int"]["output"];
  max?: Maybe<Deep_Numbers_Max_Fields>;
  min?: Maybe<Deep_Numbers_Min_Fields>;
  stddev?: Maybe<Deep_Numbers_Stddev_Fields>;
  stddev_pop?: Maybe<Deep_Numbers_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Deep_Numbers_Stddev_Samp_Fields>;
  sum?: Maybe<Deep_Numbers_Sum_Fields>;
  var_pop?: Maybe<Deep_Numbers_Var_Pop_Fields>;
  var_samp?: Maybe<Deep_Numbers_Var_Samp_Fields>;
  variance?: Maybe<Deep_Numbers_Variance_Fields>;
};

/** aggregate fields of "deep.numbers" */
export type Deep_Numbers_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Deep_Numbers_Select_Column>>;
  distinct?: InputMaybe<Scalars["Boolean"]["input"]>;
};

/** order by aggregate values of table "deep.numbers" */
export type Deep_Numbers_Aggregate_Order_By = {
  avg?: InputMaybe<Deep_Numbers_Avg_Order_By>;
  count?: InputMaybe<Order_By>;
  max?: InputMaybe<Deep_Numbers_Max_Order_By>;
  min?: InputMaybe<Deep_Numbers_Min_Order_By>;
  stddev?: InputMaybe<Deep_Numbers_Stddev_Order_By>;
  stddev_pop?: InputMaybe<Deep_Numbers_Stddev_Pop_Order_By>;
  stddev_samp?: InputMaybe<Deep_Numbers_Stddev_Samp_Order_By>;
  sum?: InputMaybe<Deep_Numbers_Sum_Order_By>;
  var_pop?: InputMaybe<Deep_Numbers_Var_Pop_Order_By>;
  var_samp?: InputMaybe<Deep_Numbers_Var_Samp_Order_By>;
  variance?: InputMaybe<Deep_Numbers_Variance_Order_By>;
};

/** input type for inserting array relation for remote table "deep.numbers" */
export type Deep_Numbers_Arr_Rel_Insert_Input = {
  data: Array<Deep_Numbers_Insert_Input>;
  /** upsert condition */
  on_conflict?: InputMaybe<Deep_Numbers_On_Conflict>;
};

/** aggregate avg on columns */
export type Deep_Numbers_Avg_Fields = {
  __typename?: "deep_numbers_avg_fields";
  _data?: Maybe<Scalars["Float"]["output"]>;
};

/** order by avg() on columns of table "deep.numbers" */
export type Deep_Numbers_Avg_Order_By = {
  _data?: InputMaybe<Order_By>;
};

/** Boolean expression to filter rows from the table "deep.numbers". All fields are combined with a logical 'AND'. */
export type Deep_Numbers_Bool_Exp = {
  _and?: InputMaybe<Array<Deep_Numbers_Bool_Exp>>;
  _data?: InputMaybe<Numeric_Comparison_Exp>;
  _not?: InputMaybe<Deep_Numbers_Bool_Exp>;
  _or?: InputMaybe<Array<Deep_Numbers_Bool_Exp>>;
  created_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  id?: InputMaybe<Uuid_Comparison_Exp>;
  link?: InputMaybe<Deep_Links_Bool_Exp>;
  updated_at?: InputMaybe<Timestamptz_Comparison_Exp>;
};

/** unique or primary key constraints on table "deep.numbers" */
export enum Deep_Numbers_Constraint {
  /** unique or primary key constraint on columns "id" */
  NumbersPkey = "numbers_pkey",
}

/** input type for incrementing numeric columns in table "deep.numbers" */
export type Deep_Numbers_Inc_Input = {
  _data?: InputMaybe<Scalars["numeric"]["input"]>;
};

/** input type for inserting data into table "deep.numbers" */
export type Deep_Numbers_Insert_Input = {
  _data?: InputMaybe<Scalars["numeric"]["input"]>;
  created_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
  id?: InputMaybe<Scalars["uuid"]["input"]>;
  link?: InputMaybe<Deep_Links_Obj_Rel_Insert_Input>;
  updated_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
};

/** aggregate max on columns */
export type Deep_Numbers_Max_Fields = {
  __typename?: "deep_numbers_max_fields";
  _data?: Maybe<Scalars["numeric"]["output"]>;
  created_at?: Maybe<Scalars["timestamptz"]["output"]>;
  id?: Maybe<Scalars["uuid"]["output"]>;
  updated_at?: Maybe<Scalars["timestamptz"]["output"]>;
};

/** order by max() on columns of table "deep.numbers" */
export type Deep_Numbers_Max_Order_By = {
  _data?: InputMaybe<Order_By>;
  created_at?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
};

/** aggregate min on columns */
export type Deep_Numbers_Min_Fields = {
  __typename?: "deep_numbers_min_fields";
  _data?: Maybe<Scalars["numeric"]["output"]>;
  created_at?: Maybe<Scalars["timestamptz"]["output"]>;
  id?: Maybe<Scalars["uuid"]["output"]>;
  updated_at?: Maybe<Scalars["timestamptz"]["output"]>;
};

/** order by min() on columns of table "deep.numbers" */
export type Deep_Numbers_Min_Order_By = {
  _data?: InputMaybe<Order_By>;
  created_at?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
};

/** response of any mutation on the table "deep.numbers" */
export type Deep_Numbers_Mutation_Response = {
  __typename?: "deep_numbers_mutation_response";
  /** number of rows affected by the mutation */
  affected_rows: Scalars["Int"]["output"];
  /** data from the rows affected by the mutation */
  returning: Array<Deep_Numbers>;
};

/** on_conflict condition type for table "deep.numbers" */
export type Deep_Numbers_On_Conflict = {
  constraint: Deep_Numbers_Constraint;
  update_columns?: Array<Deep_Numbers_Update_Column>;
  where?: InputMaybe<Deep_Numbers_Bool_Exp>;
};

/** Ordering options when selecting data from "deep.numbers". */
export type Deep_Numbers_Order_By = {
  _data?: InputMaybe<Order_By>;
  created_at?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  link?: InputMaybe<Deep_Links_Order_By>;
  updated_at?: InputMaybe<Order_By>;
};

/** primary key columns input for table: deep.numbers */
export type Deep_Numbers_Pk_Columns_Input = {
  id: Scalars["uuid"]["input"];
};

/** select columns of table "deep.numbers" */
export enum Deep_Numbers_Select_Column {
  /** column name */
  Data = "_data",
  /** column name */
  CreatedAt = "created_at",
  /** column name */
  Id = "id",
  /** column name */
  UpdatedAt = "updated_at",
}

/** input type for updating data in table "deep.numbers" */
export type Deep_Numbers_Set_Input = {
  _data?: InputMaybe<Scalars["numeric"]["input"]>;
  created_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
  id?: InputMaybe<Scalars["uuid"]["input"]>;
  updated_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
};

/** aggregate stddev on columns */
export type Deep_Numbers_Stddev_Fields = {
  __typename?: "deep_numbers_stddev_fields";
  _data?: Maybe<Scalars["Float"]["output"]>;
};

/** order by stddev() on columns of table "deep.numbers" */
export type Deep_Numbers_Stddev_Order_By = {
  _data?: InputMaybe<Order_By>;
};

/** aggregate stddev_pop on columns */
export type Deep_Numbers_Stddev_Pop_Fields = {
  __typename?: "deep_numbers_stddev_pop_fields";
  _data?: Maybe<Scalars["Float"]["output"]>;
};

/** order by stddev_pop() on columns of table "deep.numbers" */
export type Deep_Numbers_Stddev_Pop_Order_By = {
  _data?: InputMaybe<Order_By>;
};

/** aggregate stddev_samp on columns */
export type Deep_Numbers_Stddev_Samp_Fields = {
  __typename?: "deep_numbers_stddev_samp_fields";
  _data?: Maybe<Scalars["Float"]["output"]>;
};

/** order by stddev_samp() on columns of table "deep.numbers" */
export type Deep_Numbers_Stddev_Samp_Order_By = {
  _data?: InputMaybe<Order_By>;
};

/** Streaming cursor of the table "deep_numbers" */
export type Deep_Numbers_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Deep_Numbers_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Deep_Numbers_Stream_Cursor_Value_Input = {
  _data?: InputMaybe<Scalars["numeric"]["input"]>;
  created_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
  id?: InputMaybe<Scalars["uuid"]["input"]>;
  updated_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
};

/** aggregate sum on columns */
export type Deep_Numbers_Sum_Fields = {
  __typename?: "deep_numbers_sum_fields";
  _data?: Maybe<Scalars["numeric"]["output"]>;
};

/** order by sum() on columns of table "deep.numbers" */
export type Deep_Numbers_Sum_Order_By = {
  _data?: InputMaybe<Order_By>;
};

/** update columns of table "deep.numbers" */
export enum Deep_Numbers_Update_Column {
  /** column name */
  Data = "_data",
  /** column name */
  CreatedAt = "created_at",
  /** column name */
  Id = "id",
  /** column name */
  UpdatedAt = "updated_at",
}

export type Deep_Numbers_Updates = {
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<Deep_Numbers_Inc_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Deep_Numbers_Set_Input>;
  /** filter the rows which have to be updated */
  where: Deep_Numbers_Bool_Exp;
};

/** aggregate var_pop on columns */
export type Deep_Numbers_Var_Pop_Fields = {
  __typename?: "deep_numbers_var_pop_fields";
  _data?: Maybe<Scalars["Float"]["output"]>;
};

/** order by var_pop() on columns of table "deep.numbers" */
export type Deep_Numbers_Var_Pop_Order_By = {
  _data?: InputMaybe<Order_By>;
};

/** aggregate var_samp on columns */
export type Deep_Numbers_Var_Samp_Fields = {
  __typename?: "deep_numbers_var_samp_fields";
  _data?: Maybe<Scalars["Float"]["output"]>;
};

/** order by var_samp() on columns of table "deep.numbers" */
export type Deep_Numbers_Var_Samp_Order_By = {
  _data?: InputMaybe<Order_By>;
};

/** aggregate variance on columns */
export type Deep_Numbers_Variance_Fields = {
  __typename?: "deep_numbers_variance_fields";
  _data?: Maybe<Scalars["Float"]["output"]>;
};

/** order by variance() on columns of table "deep.numbers" */
export type Deep_Numbers_Variance_Order_By = {
  _data?: InputMaybe<Order_By>;
};

/** columns and relationships of "deep.strings" */
export type Deep_Strings = {
  __typename?: "deep_strings";
  _data: Scalars["String"]["output"];
  created_at: Scalars["timestamptz"]["output"];
  id: Scalars["uuid"]["output"];
  /** An object relationship */
  link: Deep_Links;
  updated_at: Scalars["timestamptz"]["output"];
};

/** aggregated selection of "deep.strings" */
export type Deep_Strings_Aggregate = {
  __typename?: "deep_strings_aggregate";
  aggregate?: Maybe<Deep_Strings_Aggregate_Fields>;
  nodes: Array<Deep_Strings>;
};

export type Deep_Strings_Aggregate_Bool_Exp = {
  count?: InputMaybe<Deep_Strings_Aggregate_Bool_Exp_Count>;
};

export type Deep_Strings_Aggregate_Bool_Exp_Count = {
  arguments?: InputMaybe<Array<Deep_Strings_Select_Column>>;
  distinct?: InputMaybe<Scalars["Boolean"]["input"]>;
  filter?: InputMaybe<Deep_Strings_Bool_Exp>;
  predicate: Int_Comparison_Exp;
};

/** aggregate fields of "deep.strings" */
export type Deep_Strings_Aggregate_Fields = {
  __typename?: "deep_strings_aggregate_fields";
  count: Scalars["Int"]["output"];
  max?: Maybe<Deep_Strings_Max_Fields>;
  min?: Maybe<Deep_Strings_Min_Fields>;
};

/** aggregate fields of "deep.strings" */
export type Deep_Strings_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Deep_Strings_Select_Column>>;
  distinct?: InputMaybe<Scalars["Boolean"]["input"]>;
};

/** order by aggregate values of table "deep.strings" */
export type Deep_Strings_Aggregate_Order_By = {
  count?: InputMaybe<Order_By>;
  max?: InputMaybe<Deep_Strings_Max_Order_By>;
  min?: InputMaybe<Deep_Strings_Min_Order_By>;
};

/** input type for inserting array relation for remote table "deep.strings" */
export type Deep_Strings_Arr_Rel_Insert_Input = {
  data: Array<Deep_Strings_Insert_Input>;
  /** upsert condition */
  on_conflict?: InputMaybe<Deep_Strings_On_Conflict>;
};

/** Boolean expression to filter rows from the table "deep.strings". All fields are combined with a logical 'AND'. */
export type Deep_Strings_Bool_Exp = {
  _and?: InputMaybe<Array<Deep_Strings_Bool_Exp>>;
  _data?: InputMaybe<String_Comparison_Exp>;
  _not?: InputMaybe<Deep_Strings_Bool_Exp>;
  _or?: InputMaybe<Array<Deep_Strings_Bool_Exp>>;
  created_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  id?: InputMaybe<Uuid_Comparison_Exp>;
  link?: InputMaybe<Deep_Links_Bool_Exp>;
  updated_at?: InputMaybe<Timestamptz_Comparison_Exp>;
};

/** unique or primary key constraints on table "deep.strings" */
export enum Deep_Strings_Constraint {
  /** unique or primary key constraint on columns "id" */
  StringsPkey = "strings_pkey",
}

/** input type for inserting data into table "deep.strings" */
export type Deep_Strings_Insert_Input = {
  _data?: InputMaybe<Scalars["String"]["input"]>;
  created_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
  id?: InputMaybe<Scalars["uuid"]["input"]>;
  link?: InputMaybe<Deep_Links_Obj_Rel_Insert_Input>;
  updated_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
};

/** aggregate max on columns */
export type Deep_Strings_Max_Fields = {
  __typename?: "deep_strings_max_fields";
  _data?: Maybe<Scalars["String"]["output"]>;
  created_at?: Maybe<Scalars["timestamptz"]["output"]>;
  id?: Maybe<Scalars["uuid"]["output"]>;
  updated_at?: Maybe<Scalars["timestamptz"]["output"]>;
};

/** order by max() on columns of table "deep.strings" */
export type Deep_Strings_Max_Order_By = {
  _data?: InputMaybe<Order_By>;
  created_at?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
};

/** aggregate min on columns */
export type Deep_Strings_Min_Fields = {
  __typename?: "deep_strings_min_fields";
  _data?: Maybe<Scalars["String"]["output"]>;
  created_at?: Maybe<Scalars["timestamptz"]["output"]>;
  id?: Maybe<Scalars["uuid"]["output"]>;
  updated_at?: Maybe<Scalars["timestamptz"]["output"]>;
};

/** order by min() on columns of table "deep.strings" */
export type Deep_Strings_Min_Order_By = {
  _data?: InputMaybe<Order_By>;
  created_at?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
};

/** response of any mutation on the table "deep.strings" */
export type Deep_Strings_Mutation_Response = {
  __typename?: "deep_strings_mutation_response";
  /** number of rows affected by the mutation */
  affected_rows: Scalars["Int"]["output"];
  /** data from the rows affected by the mutation */
  returning: Array<Deep_Strings>;
};

/** on_conflict condition type for table "deep.strings" */
export type Deep_Strings_On_Conflict = {
  constraint: Deep_Strings_Constraint;
  update_columns?: Array<Deep_Strings_Update_Column>;
  where?: InputMaybe<Deep_Strings_Bool_Exp>;
};

/** Ordering options when selecting data from "deep.strings". */
export type Deep_Strings_Order_By = {
  _data?: InputMaybe<Order_By>;
  created_at?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  link?: InputMaybe<Deep_Links_Order_By>;
  updated_at?: InputMaybe<Order_By>;
};

/** primary key columns input for table: deep.strings */
export type Deep_Strings_Pk_Columns_Input = {
  id: Scalars["uuid"]["input"];
};

/** select columns of table "deep.strings" */
export enum Deep_Strings_Select_Column {
  /** column name */
  Data = "_data",
  /** column name */
  CreatedAt = "created_at",
  /** column name */
  Id = "id",
  /** column name */
  UpdatedAt = "updated_at",
}

/** input type for updating data in table "deep.strings" */
export type Deep_Strings_Set_Input = {
  _data?: InputMaybe<Scalars["String"]["input"]>;
  created_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
  id?: InputMaybe<Scalars["uuid"]["input"]>;
  updated_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
};

/** Streaming cursor of the table "deep_strings" */
export type Deep_Strings_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Deep_Strings_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Deep_Strings_Stream_Cursor_Value_Input = {
  _data?: InputMaybe<Scalars["String"]["input"]>;
  created_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
  id?: InputMaybe<Scalars["uuid"]["input"]>;
  updated_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
};

/** update columns of table "deep.strings" */
export enum Deep_Strings_Update_Column {
  /** column name */
  Data = "_data",
  /** column name */
  CreatedAt = "created_at",
  /** column name */
  Id = "id",
  /** column name */
  UpdatedAt = "updated_at",
}

export type Deep_Strings_Updates = {
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Deep_Strings_Set_Input>;
  /** filter the rows which have to be updated */
  where: Deep_Strings_Bool_Exp;
};

export type Jsonb_Cast_Exp = {
  String?: InputMaybe<String_Comparison_Exp>;
};

/** Boolean expression to compare columns of type "jsonb". All fields are combined with logical 'AND'. */
export type Jsonb_Comparison_Exp = {
  _cast?: InputMaybe<Jsonb_Cast_Exp>;
  /** is the column contained in the given json value */
  _contained_in?: InputMaybe<Scalars["jsonb"]["input"]>;
  /** does the column contain the given json value at the top level */
  _contains?: InputMaybe<Scalars["jsonb"]["input"]>;
  _eq?: InputMaybe<Scalars["jsonb"]["input"]>;
  _gt?: InputMaybe<Scalars["jsonb"]["input"]>;
  _gte?: InputMaybe<Scalars["jsonb"]["input"]>;
  /** does the string exist as a top-level key in the column */
  _has_key?: InputMaybe<Scalars["String"]["input"]>;
  /** do all of these strings exist as top-level keys in the column */
  _has_keys_all?: InputMaybe<Array<Scalars["String"]["input"]>>;
  /** do any of these strings exist as top-level keys in the column */
  _has_keys_any?: InputMaybe<Array<Scalars["String"]["input"]>>;
  _in?: InputMaybe<Array<Scalars["jsonb"]["input"]>>;
  _is_null?: InputMaybe<Scalars["Boolean"]["input"]>;
  _lt?: InputMaybe<Scalars["jsonb"]["input"]>;
  _lte?: InputMaybe<Scalars["jsonb"]["input"]>;
  _neq?: InputMaybe<Scalars["jsonb"]["input"]>;
  _nin?: InputMaybe<Array<Scalars["jsonb"]["input"]>>;
};

/** mutation root */
export type Mutation_Root = {
  __typename?: "mutation_root";
  /** delete data from the table: "accounts" */
  delete_accounts?: Maybe<Accounts_Mutation_Response>;
  /** delete single row from the table: "accounts" */
  delete_accounts_by_pk?: Maybe<Accounts>;
  /** delete data from the table: "debug" */
  delete_debug?: Maybe<Debug_Mutation_Response>;
  /** delete single row from the table: "debug" */
  delete_debug_by_pk?: Maybe<Debug>;
  /** delete data from the table: "deep.functions" */
  delete_deep_functions?: Maybe<Deep_Functions_Mutation_Response>;
  /** delete single row from the table: "deep.functions" */
  delete_deep_functions_by_pk?: Maybe<Deep_Functions>;
  /** delete data from the table: "deep.links" */
  delete_deep_links?: Maybe<Deep_Links_Mutation_Response>;
  /** delete single row from the table: "deep.links" */
  delete_deep_links_by_pk?: Maybe<Deep_Links>;
  /** delete data from the table: "deep.numbers" */
  delete_deep_numbers?: Maybe<Deep_Numbers_Mutation_Response>;
  /** delete single row from the table: "deep.numbers" */
  delete_deep_numbers_by_pk?: Maybe<Deep_Numbers>;
  /** delete data from the table: "deep.strings" */
  delete_deep_strings?: Maybe<Deep_Strings_Mutation_Response>;
  /** delete single row from the table: "deep.strings" */
  delete_deep_strings_by_pk?: Maybe<Deep_Strings>;
  /** delete data from the table: "notification_messages" */
  delete_notification_messages?: Maybe<Notification_Messages_Mutation_Response>;
  /** delete single row from the table: "notification_messages" */
  delete_notification_messages_by_pk?: Maybe<Notification_Messages>;
  /** delete data from the table: "notification_permissions" */
  delete_notification_permissions?: Maybe<Notification_Permissions_Mutation_Response>;
  /** delete single row from the table: "notification_permissions" */
  delete_notification_permissions_by_pk?: Maybe<Notification_Permissions>;
  /** delete data from the table: "notifications" */
  delete_notifications?: Maybe<Notifications_Mutation_Response>;
  /** delete single row from the table: "notifications" */
  delete_notifications_by_pk?: Maybe<Notifications>;
  /** delete data from the table: "users" */
  delete_users?: Maybe<Users_Mutation_Response>;
  /** delete single row from the table: "users" */
  delete_users_by_pk?: Maybe<Users>;
  /** insert data into the table: "accounts" */
  insert_accounts?: Maybe<Accounts_Mutation_Response>;
  /** insert a single row into the table: "accounts" */
  insert_accounts_one?: Maybe<Accounts>;
  /** insert data into the table: "debug" */
  insert_debug?: Maybe<Debug_Mutation_Response>;
  /** insert a single row into the table: "debug" */
  insert_debug_one?: Maybe<Debug>;
  /** insert data into the table: "deep.functions" */
  insert_deep_functions?: Maybe<Deep_Functions_Mutation_Response>;
  /** insert a single row into the table: "deep.functions" */
  insert_deep_functions_one?: Maybe<Deep_Functions>;
  /** insert data into the table: "deep.links" */
  insert_deep_links?: Maybe<Deep_Links_Mutation_Response>;
  /** insert a single row into the table: "deep.links" */
  insert_deep_links_one?: Maybe<Deep_Links>;
  /** insert data into the table: "deep.numbers" */
  insert_deep_numbers?: Maybe<Deep_Numbers_Mutation_Response>;
  /** insert a single row into the table: "deep.numbers" */
  insert_deep_numbers_one?: Maybe<Deep_Numbers>;
  /** insert data into the table: "deep.strings" */
  insert_deep_strings?: Maybe<Deep_Strings_Mutation_Response>;
  /** insert a single row into the table: "deep.strings" */
  insert_deep_strings_one?: Maybe<Deep_Strings>;
  /** insert data into the table: "notification_messages" */
  insert_notification_messages?: Maybe<Notification_Messages_Mutation_Response>;
  /** insert a single row into the table: "notification_messages" */
  insert_notification_messages_one?: Maybe<Notification_Messages>;
  /** insert data into the table: "notification_permissions" */
  insert_notification_permissions?: Maybe<Notification_Permissions_Mutation_Response>;
  /** insert a single row into the table: "notification_permissions" */
  insert_notification_permissions_one?: Maybe<Notification_Permissions>;
  /** insert data into the table: "notifications" */
  insert_notifications?: Maybe<Notifications_Mutation_Response>;
  /** insert a single row into the table: "notifications" */
  insert_notifications_one?: Maybe<Notifications>;
  /** insert data into the table: "users" */
  insert_users?: Maybe<Users_Mutation_Response>;
  /** insert a single row into the table: "users" */
  insert_users_one?: Maybe<Users>;
  /** update data of the table: "accounts" */
  update_accounts?: Maybe<Accounts_Mutation_Response>;
  /** update single row of the table: "accounts" */
  update_accounts_by_pk?: Maybe<Accounts>;
  /** update multiples rows of table: "accounts" */
  update_accounts_many?: Maybe<Array<Maybe<Accounts_Mutation_Response>>>;
  /** update data of the table: "debug" */
  update_debug?: Maybe<Debug_Mutation_Response>;
  /** update single row of the table: "debug" */
  update_debug_by_pk?: Maybe<Debug>;
  /** update multiples rows of table: "debug" */
  update_debug_many?: Maybe<Array<Maybe<Debug_Mutation_Response>>>;
  /** update data of the table: "deep.functions" */
  update_deep_functions?: Maybe<Deep_Functions_Mutation_Response>;
  /** update single row of the table: "deep.functions" */
  update_deep_functions_by_pk?: Maybe<Deep_Functions>;
  /** update multiples rows of table: "deep.functions" */
  update_deep_functions_many?: Maybe<
    Array<Maybe<Deep_Functions_Mutation_Response>>
  >;
  /** update data of the table: "deep.links" */
  update_deep_links?: Maybe<Deep_Links_Mutation_Response>;
  /** update single row of the table: "deep.links" */
  update_deep_links_by_pk?: Maybe<Deep_Links>;
  /** update multiples rows of table: "deep.links" */
  update_deep_links_many?: Maybe<Array<Maybe<Deep_Links_Mutation_Response>>>;
  /** update data of the table: "deep.numbers" */
  update_deep_numbers?: Maybe<Deep_Numbers_Mutation_Response>;
  /** update single row of the table: "deep.numbers" */
  update_deep_numbers_by_pk?: Maybe<Deep_Numbers>;
  /** update multiples rows of table: "deep.numbers" */
  update_deep_numbers_many?: Maybe<
    Array<Maybe<Deep_Numbers_Mutation_Response>>
  >;
  /** update data of the table: "deep.strings" */
  update_deep_strings?: Maybe<Deep_Strings_Mutation_Response>;
  /** update single row of the table: "deep.strings" */
  update_deep_strings_by_pk?: Maybe<Deep_Strings>;
  /** update multiples rows of table: "deep.strings" */
  update_deep_strings_many?: Maybe<
    Array<Maybe<Deep_Strings_Mutation_Response>>
  >;
  /** update data of the table: "notification_messages" */
  update_notification_messages?: Maybe<Notification_Messages_Mutation_Response>;
  /** update single row of the table: "notification_messages" */
  update_notification_messages_by_pk?: Maybe<Notification_Messages>;
  /** update multiples rows of table: "notification_messages" */
  update_notification_messages_many?: Maybe<
    Array<Maybe<Notification_Messages_Mutation_Response>>
  >;
  /** update data of the table: "notification_permissions" */
  update_notification_permissions?: Maybe<Notification_Permissions_Mutation_Response>;
  /** update single row of the table: "notification_permissions" */
  update_notification_permissions_by_pk?: Maybe<Notification_Permissions>;
  /** update multiples rows of table: "notification_permissions" */
  update_notification_permissions_many?: Maybe<
    Array<Maybe<Notification_Permissions_Mutation_Response>>
  >;
  /** update data of the table: "notifications" */
  update_notifications?: Maybe<Notifications_Mutation_Response>;
  /** update single row of the table: "notifications" */
  update_notifications_by_pk?: Maybe<Notifications>;
  /** update multiples rows of table: "notifications" */
  update_notifications_many?: Maybe<
    Array<Maybe<Notifications_Mutation_Response>>
  >;
  /** update data of the table: "users" */
  update_users?: Maybe<Users_Mutation_Response>;
  /** update single row of the table: "users" */
  update_users_by_pk?: Maybe<Users>;
  /** update multiples rows of table: "users" */
  update_users_many?: Maybe<Array<Maybe<Users_Mutation_Response>>>;
};

/** mutation root */
export type Mutation_RootDelete_AccountsArgs = {
  where: Accounts_Bool_Exp;
};

/** mutation root */
export type Mutation_RootDelete_Accounts_By_PkArgs = {
  id: Scalars["uuid"]["input"];
};

/** mutation root */
export type Mutation_RootDelete_DebugArgs = {
  where: Debug_Bool_Exp;
};

/** mutation root */
export type Mutation_RootDelete_Debug_By_PkArgs = {
  id: Scalars["uuid"]["input"];
};

/** mutation root */
export type Mutation_RootDelete_Deep_FunctionsArgs = {
  where: Deep_Functions_Bool_Exp;
};

/** mutation root */
export type Mutation_RootDelete_Deep_Functions_By_PkArgs = {
  id: Scalars["uuid"]["input"];
};

/** mutation root */
export type Mutation_RootDelete_Deep_LinksArgs = {
  where: Deep_Links_Bool_Exp;
};

/** mutation root */
export type Mutation_RootDelete_Deep_Links_By_PkArgs = {
  id: Scalars["uuid"]["input"];
};

/** mutation root */
export type Mutation_RootDelete_Deep_NumbersArgs = {
  where: Deep_Numbers_Bool_Exp;
};

/** mutation root */
export type Mutation_RootDelete_Deep_Numbers_By_PkArgs = {
  id: Scalars["uuid"]["input"];
};

/** mutation root */
export type Mutation_RootDelete_Deep_StringsArgs = {
  where: Deep_Strings_Bool_Exp;
};

/** mutation root */
export type Mutation_RootDelete_Deep_Strings_By_PkArgs = {
  id: Scalars["uuid"]["input"];
};

/** mutation root */
export type Mutation_RootDelete_Notification_MessagesArgs = {
  where: Notification_Messages_Bool_Exp;
};

/** mutation root */
export type Mutation_RootDelete_Notification_Messages_By_PkArgs = {
  id: Scalars["uuid"]["input"];
};

/** mutation root */
export type Mutation_RootDelete_Notification_PermissionsArgs = {
  where: Notification_Permissions_Bool_Exp;
};

/** mutation root */
export type Mutation_RootDelete_Notification_Permissions_By_PkArgs = {
  id: Scalars["uuid"]["input"];
};

/** mutation root */
export type Mutation_RootDelete_NotificationsArgs = {
  where: Notifications_Bool_Exp;
};

/** mutation root */
export type Mutation_RootDelete_Notifications_By_PkArgs = {
  id: Scalars["uuid"]["input"];
};

/** mutation root */
export type Mutation_RootDelete_UsersArgs = {
  where: Users_Bool_Exp;
};

/** mutation root */
export type Mutation_RootDelete_Users_By_PkArgs = {
  id: Scalars["uuid"]["input"];
};

/** mutation root */
export type Mutation_RootInsert_AccountsArgs = {
  objects: Array<Accounts_Insert_Input>;
  on_conflict?: InputMaybe<Accounts_On_Conflict>;
};

/** mutation root */
export type Mutation_RootInsert_Accounts_OneArgs = {
  object: Accounts_Insert_Input;
  on_conflict?: InputMaybe<Accounts_On_Conflict>;
};

/** mutation root */
export type Mutation_RootInsert_DebugArgs = {
  objects: Array<Debug_Insert_Input>;
  on_conflict?: InputMaybe<Debug_On_Conflict>;
};

/** mutation root */
export type Mutation_RootInsert_Debug_OneArgs = {
  object: Debug_Insert_Input;
  on_conflict?: InputMaybe<Debug_On_Conflict>;
};

/** mutation root */
export type Mutation_RootInsert_Deep_FunctionsArgs = {
  objects: Array<Deep_Functions_Insert_Input>;
  on_conflict?: InputMaybe<Deep_Functions_On_Conflict>;
};

/** mutation root */
export type Mutation_RootInsert_Deep_Functions_OneArgs = {
  object: Deep_Functions_Insert_Input;
  on_conflict?: InputMaybe<Deep_Functions_On_Conflict>;
};

/** mutation root */
export type Mutation_RootInsert_Deep_LinksArgs = {
  objects: Array<Deep_Links_Insert_Input>;
  on_conflict?: InputMaybe<Deep_Links_On_Conflict>;
};

/** mutation root */
export type Mutation_RootInsert_Deep_Links_OneArgs = {
  object: Deep_Links_Insert_Input;
  on_conflict?: InputMaybe<Deep_Links_On_Conflict>;
};

/** mutation root */
export type Mutation_RootInsert_Deep_NumbersArgs = {
  objects: Array<Deep_Numbers_Insert_Input>;
  on_conflict?: InputMaybe<Deep_Numbers_On_Conflict>;
};

/** mutation root */
export type Mutation_RootInsert_Deep_Numbers_OneArgs = {
  object: Deep_Numbers_Insert_Input;
  on_conflict?: InputMaybe<Deep_Numbers_On_Conflict>;
};

/** mutation root */
export type Mutation_RootInsert_Deep_StringsArgs = {
  objects: Array<Deep_Strings_Insert_Input>;
  on_conflict?: InputMaybe<Deep_Strings_On_Conflict>;
};

/** mutation root */
export type Mutation_RootInsert_Deep_Strings_OneArgs = {
  object: Deep_Strings_Insert_Input;
  on_conflict?: InputMaybe<Deep_Strings_On_Conflict>;
};

/** mutation root */
export type Mutation_RootInsert_Notification_MessagesArgs = {
  objects: Array<Notification_Messages_Insert_Input>;
  on_conflict?: InputMaybe<Notification_Messages_On_Conflict>;
};

/** mutation root */
export type Mutation_RootInsert_Notification_Messages_OneArgs = {
  object: Notification_Messages_Insert_Input;
  on_conflict?: InputMaybe<Notification_Messages_On_Conflict>;
};

/** mutation root */
export type Mutation_RootInsert_Notification_PermissionsArgs = {
  objects: Array<Notification_Permissions_Insert_Input>;
  on_conflict?: InputMaybe<Notification_Permissions_On_Conflict>;
};

/** mutation root */
export type Mutation_RootInsert_Notification_Permissions_OneArgs = {
  object: Notification_Permissions_Insert_Input;
  on_conflict?: InputMaybe<Notification_Permissions_On_Conflict>;
};

/** mutation root */
export type Mutation_RootInsert_NotificationsArgs = {
  objects: Array<Notifications_Insert_Input>;
  on_conflict?: InputMaybe<Notifications_On_Conflict>;
};

/** mutation root */
export type Mutation_RootInsert_Notifications_OneArgs = {
  object: Notifications_Insert_Input;
  on_conflict?: InputMaybe<Notifications_On_Conflict>;
};

/** mutation root */
export type Mutation_RootInsert_UsersArgs = {
  objects: Array<Users_Insert_Input>;
  on_conflict?: InputMaybe<Users_On_Conflict>;
};

/** mutation root */
export type Mutation_RootInsert_Users_OneArgs = {
  object: Users_Insert_Input;
  on_conflict?: InputMaybe<Users_On_Conflict>;
};

/** mutation root */
export type Mutation_RootUpdate_AccountsArgs = {
  _inc?: InputMaybe<Accounts_Inc_Input>;
  _set?: InputMaybe<Accounts_Set_Input>;
  where: Accounts_Bool_Exp;
};

/** mutation root */
export type Mutation_RootUpdate_Accounts_By_PkArgs = {
  _inc?: InputMaybe<Accounts_Inc_Input>;
  _set?: InputMaybe<Accounts_Set_Input>;
  pk_columns: Accounts_Pk_Columns_Input;
};

/** mutation root */
export type Mutation_RootUpdate_Accounts_ManyArgs = {
  updates: Array<Accounts_Updates>;
};

/** mutation root */
export type Mutation_RootUpdate_DebugArgs = {
  _append?: InputMaybe<Debug_Append_Input>;
  _delete_at_path?: InputMaybe<Debug_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Debug_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Debug_Delete_Key_Input>;
  _prepend?: InputMaybe<Debug_Prepend_Input>;
  _set?: InputMaybe<Debug_Set_Input>;
  where: Debug_Bool_Exp;
};

/** mutation root */
export type Mutation_RootUpdate_Debug_By_PkArgs = {
  _append?: InputMaybe<Debug_Append_Input>;
  _delete_at_path?: InputMaybe<Debug_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Debug_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Debug_Delete_Key_Input>;
  _prepend?: InputMaybe<Debug_Prepend_Input>;
  _set?: InputMaybe<Debug_Set_Input>;
  pk_columns: Debug_Pk_Columns_Input;
};

/** mutation root */
export type Mutation_RootUpdate_Debug_ManyArgs = {
  updates: Array<Debug_Updates>;
};

/** mutation root */
export type Mutation_RootUpdate_Deep_FunctionsArgs = {
  _append?: InputMaybe<Deep_Functions_Append_Input>;
  _delete_at_path?: InputMaybe<Deep_Functions_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Deep_Functions_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Deep_Functions_Delete_Key_Input>;
  _prepend?: InputMaybe<Deep_Functions_Prepend_Input>;
  _set?: InputMaybe<Deep_Functions_Set_Input>;
  where: Deep_Functions_Bool_Exp;
};

/** mutation root */
export type Mutation_RootUpdate_Deep_Functions_By_PkArgs = {
  _append?: InputMaybe<Deep_Functions_Append_Input>;
  _delete_at_path?: InputMaybe<Deep_Functions_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Deep_Functions_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Deep_Functions_Delete_Key_Input>;
  _prepend?: InputMaybe<Deep_Functions_Prepend_Input>;
  _set?: InputMaybe<Deep_Functions_Set_Input>;
  pk_columns: Deep_Functions_Pk_Columns_Input;
};

/** mutation root */
export type Mutation_RootUpdate_Deep_Functions_ManyArgs = {
  updates: Array<Deep_Functions_Updates>;
};

/** mutation root */
export type Mutation_RootUpdate_Deep_LinksArgs = {
  _set?: InputMaybe<Deep_Links_Set_Input>;
  where: Deep_Links_Bool_Exp;
};

/** mutation root */
export type Mutation_RootUpdate_Deep_Links_By_PkArgs = {
  _set?: InputMaybe<Deep_Links_Set_Input>;
  pk_columns: Deep_Links_Pk_Columns_Input;
};

/** mutation root */
export type Mutation_RootUpdate_Deep_Links_ManyArgs = {
  updates: Array<Deep_Links_Updates>;
};

/** mutation root */
export type Mutation_RootUpdate_Deep_NumbersArgs = {
  _inc?: InputMaybe<Deep_Numbers_Inc_Input>;
  _set?: InputMaybe<Deep_Numbers_Set_Input>;
  where: Deep_Numbers_Bool_Exp;
};

/** mutation root */
export type Mutation_RootUpdate_Deep_Numbers_By_PkArgs = {
  _inc?: InputMaybe<Deep_Numbers_Inc_Input>;
  _set?: InputMaybe<Deep_Numbers_Set_Input>;
  pk_columns: Deep_Numbers_Pk_Columns_Input;
};

/** mutation root */
export type Mutation_RootUpdate_Deep_Numbers_ManyArgs = {
  updates: Array<Deep_Numbers_Updates>;
};

/** mutation root */
export type Mutation_RootUpdate_Deep_StringsArgs = {
  _set?: InputMaybe<Deep_Strings_Set_Input>;
  where: Deep_Strings_Bool_Exp;
};

/** mutation root */
export type Mutation_RootUpdate_Deep_Strings_By_PkArgs = {
  _set?: InputMaybe<Deep_Strings_Set_Input>;
  pk_columns: Deep_Strings_Pk_Columns_Input;
};

/** mutation root */
export type Mutation_RootUpdate_Deep_Strings_ManyArgs = {
  updates: Array<Deep_Strings_Updates>;
};

/** mutation root */
export type Mutation_RootUpdate_Notification_MessagesArgs = {
  _append?: InputMaybe<Notification_Messages_Append_Input>;
  _delete_at_path?: InputMaybe<Notification_Messages_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Notification_Messages_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Notification_Messages_Delete_Key_Input>;
  _prepend?: InputMaybe<Notification_Messages_Prepend_Input>;
  _set?: InputMaybe<Notification_Messages_Set_Input>;
  where: Notification_Messages_Bool_Exp;
};

/** mutation root */
export type Mutation_RootUpdate_Notification_Messages_By_PkArgs = {
  _append?: InputMaybe<Notification_Messages_Append_Input>;
  _delete_at_path?: InputMaybe<Notification_Messages_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Notification_Messages_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Notification_Messages_Delete_Key_Input>;
  _prepend?: InputMaybe<Notification_Messages_Prepend_Input>;
  _set?: InputMaybe<Notification_Messages_Set_Input>;
  pk_columns: Notification_Messages_Pk_Columns_Input;
};

/** mutation root */
export type Mutation_RootUpdate_Notification_Messages_ManyArgs = {
  updates: Array<Notification_Messages_Updates>;
};

/** mutation root */
export type Mutation_RootUpdate_Notification_PermissionsArgs = {
  _append?: InputMaybe<Notification_Permissions_Append_Input>;
  _delete_at_path?: InputMaybe<Notification_Permissions_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Notification_Permissions_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Notification_Permissions_Delete_Key_Input>;
  _prepend?: InputMaybe<Notification_Permissions_Prepend_Input>;
  _set?: InputMaybe<Notification_Permissions_Set_Input>;
  where: Notification_Permissions_Bool_Exp;
};

/** mutation root */
export type Mutation_RootUpdate_Notification_Permissions_By_PkArgs = {
  _append?: InputMaybe<Notification_Permissions_Append_Input>;
  _delete_at_path?: InputMaybe<Notification_Permissions_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Notification_Permissions_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Notification_Permissions_Delete_Key_Input>;
  _prepend?: InputMaybe<Notification_Permissions_Prepend_Input>;
  _set?: InputMaybe<Notification_Permissions_Set_Input>;
  pk_columns: Notification_Permissions_Pk_Columns_Input;
};

/** mutation root */
export type Mutation_RootUpdate_Notification_Permissions_ManyArgs = {
  updates: Array<Notification_Permissions_Updates>;
};

/** mutation root */
export type Mutation_RootUpdate_NotificationsArgs = {
  _append?: InputMaybe<Notifications_Append_Input>;
  _delete_at_path?: InputMaybe<Notifications_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Notifications_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Notifications_Delete_Key_Input>;
  _prepend?: InputMaybe<Notifications_Prepend_Input>;
  _set?: InputMaybe<Notifications_Set_Input>;
  where: Notifications_Bool_Exp;
};

/** mutation root */
export type Mutation_RootUpdate_Notifications_By_PkArgs = {
  _append?: InputMaybe<Notifications_Append_Input>;
  _delete_at_path?: InputMaybe<Notifications_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Notifications_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Notifications_Delete_Key_Input>;
  _prepend?: InputMaybe<Notifications_Prepend_Input>;
  _set?: InputMaybe<Notifications_Set_Input>;
  pk_columns: Notifications_Pk_Columns_Input;
};

/** mutation root */
export type Mutation_RootUpdate_Notifications_ManyArgs = {
  updates: Array<Notifications_Updates>;
};

/** mutation root */
export type Mutation_RootUpdate_UsersArgs = {
  _set?: InputMaybe<Users_Set_Input>;
  where: Users_Bool_Exp;
};

/** mutation root */
export type Mutation_RootUpdate_Users_By_PkArgs = {
  _set?: InputMaybe<Users_Set_Input>;
  pk_columns: Users_Pk_Columns_Input;
};

/** mutation root */
export type Mutation_RootUpdate_Users_ManyArgs = {
  updates: Array<Users_Updates>;
};

/** columns and relationships of "notification_messages" */
export type Notification_Messages = {
  __typename?: "notification_messages";
  body: Scalars["String"]["output"];
  created_at: Scalars["timestamptz"]["output"];
  data?: Maybe<Scalars["jsonb"]["output"]>;
  id: Scalars["uuid"]["output"];
  /** An array relationship */
  notifications: Array<Notifications>;
  /** An aggregate relationship */
  notifications_aggregate: Notifications_Aggregate;
  title: Scalars["String"]["output"];
  /** An object relationship */
  user: Users;
  user_id: Scalars["uuid"]["output"];
};

/** columns and relationships of "notification_messages" */
export type Notification_MessagesDataArgs = {
  path?: InputMaybe<Scalars["String"]["input"]>;
};

/** columns and relationships of "notification_messages" */
export type Notification_MessagesNotificationsArgs = {
  distinct_on?: InputMaybe<Array<Notifications_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Notifications_Order_By>>;
  where?: InputMaybe<Notifications_Bool_Exp>;
};

/** columns and relationships of "notification_messages" */
export type Notification_MessagesNotifications_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Notifications_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Notifications_Order_By>>;
  where?: InputMaybe<Notifications_Bool_Exp>;
};

/** aggregated selection of "notification_messages" */
export type Notification_Messages_Aggregate = {
  __typename?: "notification_messages_aggregate";
  aggregate?: Maybe<Notification_Messages_Aggregate_Fields>;
  nodes: Array<Notification_Messages>;
};

export type Notification_Messages_Aggregate_Bool_Exp = {
  count?: InputMaybe<Notification_Messages_Aggregate_Bool_Exp_Count>;
};

export type Notification_Messages_Aggregate_Bool_Exp_Count = {
  arguments?: InputMaybe<Array<Notification_Messages_Select_Column>>;
  distinct?: InputMaybe<Scalars["Boolean"]["input"]>;
  filter?: InputMaybe<Notification_Messages_Bool_Exp>;
  predicate: Int_Comparison_Exp;
};

/** aggregate fields of "notification_messages" */
export type Notification_Messages_Aggregate_Fields = {
  __typename?: "notification_messages_aggregate_fields";
  count: Scalars["Int"]["output"];
  max?: Maybe<Notification_Messages_Max_Fields>;
  min?: Maybe<Notification_Messages_Min_Fields>;
};

/** aggregate fields of "notification_messages" */
export type Notification_Messages_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Notification_Messages_Select_Column>>;
  distinct?: InputMaybe<Scalars["Boolean"]["input"]>;
};

/** order by aggregate values of table "notification_messages" */
export type Notification_Messages_Aggregate_Order_By = {
  count?: InputMaybe<Order_By>;
  max?: InputMaybe<Notification_Messages_Max_Order_By>;
  min?: InputMaybe<Notification_Messages_Min_Order_By>;
};

/** append existing jsonb value of filtered columns with new jsonb value */
export type Notification_Messages_Append_Input = {
  data?: InputMaybe<Scalars["jsonb"]["input"]>;
};

/** input type for inserting array relation for remote table "notification_messages" */
export type Notification_Messages_Arr_Rel_Insert_Input = {
  data: Array<Notification_Messages_Insert_Input>;
  /** upsert condition */
  on_conflict?: InputMaybe<Notification_Messages_On_Conflict>;
};

/** Boolean expression to filter rows from the table "notification_messages". All fields are combined with a logical 'AND'. */
export type Notification_Messages_Bool_Exp = {
  _and?: InputMaybe<Array<Notification_Messages_Bool_Exp>>;
  _not?: InputMaybe<Notification_Messages_Bool_Exp>;
  _or?: InputMaybe<Array<Notification_Messages_Bool_Exp>>;
  body?: InputMaybe<String_Comparison_Exp>;
  created_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  data?: InputMaybe<Jsonb_Comparison_Exp>;
  id?: InputMaybe<Uuid_Comparison_Exp>;
  notifications?: InputMaybe<Notifications_Bool_Exp>;
  notifications_aggregate?: InputMaybe<Notifications_Aggregate_Bool_Exp>;
  title?: InputMaybe<String_Comparison_Exp>;
  user?: InputMaybe<Users_Bool_Exp>;
  user_id?: InputMaybe<Uuid_Comparison_Exp>;
};

/** unique or primary key constraints on table "notification_messages" */
export enum Notification_Messages_Constraint {
  /** unique or primary key constraint on columns "id" */
  NotificationMessagesPkey = "notification_messages_pkey",
}

/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
export type Notification_Messages_Delete_At_Path_Input = {
  data?: InputMaybe<Array<Scalars["String"]["input"]>>;
};

/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
export type Notification_Messages_Delete_Elem_Input = {
  data?: InputMaybe<Scalars["Int"]["input"]>;
};

/** delete key/value pair or string element. key/value pairs are matched based on their key value */
export type Notification_Messages_Delete_Key_Input = {
  data?: InputMaybe<Scalars["String"]["input"]>;
};

/** input type for inserting data into table "notification_messages" */
export type Notification_Messages_Insert_Input = {
  body?: InputMaybe<Scalars["String"]["input"]>;
  created_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
  data?: InputMaybe<Scalars["jsonb"]["input"]>;
  id?: InputMaybe<Scalars["uuid"]["input"]>;
  notifications?: InputMaybe<Notifications_Arr_Rel_Insert_Input>;
  title?: InputMaybe<Scalars["String"]["input"]>;
  user?: InputMaybe<Users_Obj_Rel_Insert_Input>;
  user_id?: InputMaybe<Scalars["uuid"]["input"]>;
};

/** aggregate max on columns */
export type Notification_Messages_Max_Fields = {
  __typename?: "notification_messages_max_fields";
  body?: Maybe<Scalars["String"]["output"]>;
  created_at?: Maybe<Scalars["timestamptz"]["output"]>;
  id?: Maybe<Scalars["uuid"]["output"]>;
  title?: Maybe<Scalars["String"]["output"]>;
  user_id?: Maybe<Scalars["uuid"]["output"]>;
};

/** order by max() on columns of table "notification_messages" */
export type Notification_Messages_Max_Order_By = {
  body?: InputMaybe<Order_By>;
  created_at?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  title?: InputMaybe<Order_By>;
  user_id?: InputMaybe<Order_By>;
};

/** aggregate min on columns */
export type Notification_Messages_Min_Fields = {
  __typename?: "notification_messages_min_fields";
  body?: Maybe<Scalars["String"]["output"]>;
  created_at?: Maybe<Scalars["timestamptz"]["output"]>;
  id?: Maybe<Scalars["uuid"]["output"]>;
  title?: Maybe<Scalars["String"]["output"]>;
  user_id?: Maybe<Scalars["uuid"]["output"]>;
};

/** order by min() on columns of table "notification_messages" */
export type Notification_Messages_Min_Order_By = {
  body?: InputMaybe<Order_By>;
  created_at?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  title?: InputMaybe<Order_By>;
  user_id?: InputMaybe<Order_By>;
};

/** response of any mutation on the table "notification_messages" */
export type Notification_Messages_Mutation_Response = {
  __typename?: "notification_messages_mutation_response";
  /** number of rows affected by the mutation */
  affected_rows: Scalars["Int"]["output"];
  /** data from the rows affected by the mutation */
  returning: Array<Notification_Messages>;
};

/** input type for inserting object relation for remote table "notification_messages" */
export type Notification_Messages_Obj_Rel_Insert_Input = {
  data: Notification_Messages_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<Notification_Messages_On_Conflict>;
};

/** on_conflict condition type for table "notification_messages" */
export type Notification_Messages_On_Conflict = {
  constraint: Notification_Messages_Constraint;
  update_columns?: Array<Notification_Messages_Update_Column>;
  where?: InputMaybe<Notification_Messages_Bool_Exp>;
};

/** Ordering options when selecting data from "notification_messages". */
export type Notification_Messages_Order_By = {
  body?: InputMaybe<Order_By>;
  created_at?: InputMaybe<Order_By>;
  data?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  notifications_aggregate?: InputMaybe<Notifications_Aggregate_Order_By>;
  title?: InputMaybe<Order_By>;
  user?: InputMaybe<Users_Order_By>;
  user_id?: InputMaybe<Order_By>;
};

/** primary key columns input for table: notification_messages */
export type Notification_Messages_Pk_Columns_Input = {
  id: Scalars["uuid"]["input"];
};

/** prepend existing jsonb value of filtered columns with new jsonb value */
export type Notification_Messages_Prepend_Input = {
  data?: InputMaybe<Scalars["jsonb"]["input"]>;
};

/** select columns of table "notification_messages" */
export enum Notification_Messages_Select_Column {
  /** column name */
  Body = "body",
  /** column name */
  CreatedAt = "created_at",
  /** column name */
  Data = "data",
  /** column name */
  Id = "id",
  /** column name */
  Title = "title",
  /** column name */
  UserId = "user_id",
}

/** input type for updating data in table "notification_messages" */
export type Notification_Messages_Set_Input = {
  body?: InputMaybe<Scalars["String"]["input"]>;
  created_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
  data?: InputMaybe<Scalars["jsonb"]["input"]>;
  id?: InputMaybe<Scalars["uuid"]["input"]>;
  title?: InputMaybe<Scalars["String"]["input"]>;
  user_id?: InputMaybe<Scalars["uuid"]["input"]>;
};

/** Streaming cursor of the table "notification_messages" */
export type Notification_Messages_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Notification_Messages_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Notification_Messages_Stream_Cursor_Value_Input = {
  body?: InputMaybe<Scalars["String"]["input"]>;
  created_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
  data?: InputMaybe<Scalars["jsonb"]["input"]>;
  id?: InputMaybe<Scalars["uuid"]["input"]>;
  title?: InputMaybe<Scalars["String"]["input"]>;
  user_id?: InputMaybe<Scalars["uuid"]["input"]>;
};

/** update columns of table "notification_messages" */
export enum Notification_Messages_Update_Column {
  /** column name */
  Body = "body",
  /** column name */
  CreatedAt = "created_at",
  /** column name */
  Data = "data",
  /** column name */
  Id = "id",
  /** column name */
  Title = "title",
  /** column name */
  UserId = "user_id",
}

export type Notification_Messages_Updates = {
  /** append existing jsonb value of filtered columns with new jsonb value */
  _append?: InputMaybe<Notification_Messages_Append_Input>;
  /** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
  _delete_at_path?: InputMaybe<Notification_Messages_Delete_At_Path_Input>;
  /** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
  _delete_elem?: InputMaybe<Notification_Messages_Delete_Elem_Input>;
  /** delete key/value pair or string element. key/value pairs are matched based on their key value */
  _delete_key?: InputMaybe<Notification_Messages_Delete_Key_Input>;
  /** prepend existing jsonb value of filtered columns with new jsonb value */
  _prepend?: InputMaybe<Notification_Messages_Prepend_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Notification_Messages_Set_Input>;
  /** filter the rows which have to be updated */
  where: Notification_Messages_Bool_Exp;
};

/** columns and relationships of "notification_permissions" */
export type Notification_Permissions = {
  __typename?: "notification_permissions";
  created_at: Scalars["timestamptz"]["output"];
  device_info: Scalars["jsonb"]["output"];
  device_token: Scalars["String"]["output"];
  id: Scalars["uuid"]["output"];
  /** An array relationship */
  notifications: Array<Notifications>;
  /** An aggregate relationship */
  notifications_aggregate: Notifications_Aggregate;
  provider: Scalars["String"]["output"];
  updated_at: Scalars["timestamptz"]["output"];
  /** An object relationship */
  user: Users;
  user_id: Scalars["uuid"]["output"];
};

/** columns and relationships of "notification_permissions" */
export type Notification_PermissionsDevice_InfoArgs = {
  path?: InputMaybe<Scalars["String"]["input"]>;
};

/** columns and relationships of "notification_permissions" */
export type Notification_PermissionsNotificationsArgs = {
  distinct_on?: InputMaybe<Array<Notifications_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Notifications_Order_By>>;
  where?: InputMaybe<Notifications_Bool_Exp>;
};

/** columns and relationships of "notification_permissions" */
export type Notification_PermissionsNotifications_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Notifications_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Notifications_Order_By>>;
  where?: InputMaybe<Notifications_Bool_Exp>;
};

/** aggregated selection of "notification_permissions" */
export type Notification_Permissions_Aggregate = {
  __typename?: "notification_permissions_aggregate";
  aggregate?: Maybe<Notification_Permissions_Aggregate_Fields>;
  nodes: Array<Notification_Permissions>;
};

export type Notification_Permissions_Aggregate_Bool_Exp = {
  count?: InputMaybe<Notification_Permissions_Aggregate_Bool_Exp_Count>;
};

export type Notification_Permissions_Aggregate_Bool_Exp_Count = {
  arguments?: InputMaybe<Array<Notification_Permissions_Select_Column>>;
  distinct?: InputMaybe<Scalars["Boolean"]["input"]>;
  filter?: InputMaybe<Notification_Permissions_Bool_Exp>;
  predicate: Int_Comparison_Exp;
};

/** aggregate fields of "notification_permissions" */
export type Notification_Permissions_Aggregate_Fields = {
  __typename?: "notification_permissions_aggregate_fields";
  count: Scalars["Int"]["output"];
  max?: Maybe<Notification_Permissions_Max_Fields>;
  min?: Maybe<Notification_Permissions_Min_Fields>;
};

/** aggregate fields of "notification_permissions" */
export type Notification_Permissions_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Notification_Permissions_Select_Column>>;
  distinct?: InputMaybe<Scalars["Boolean"]["input"]>;
};

/** order by aggregate values of table "notification_permissions" */
export type Notification_Permissions_Aggregate_Order_By = {
  count?: InputMaybe<Order_By>;
  max?: InputMaybe<Notification_Permissions_Max_Order_By>;
  min?: InputMaybe<Notification_Permissions_Min_Order_By>;
};

/** append existing jsonb value of filtered columns with new jsonb value */
export type Notification_Permissions_Append_Input = {
  device_info?: InputMaybe<Scalars["jsonb"]["input"]>;
};

/** input type for inserting array relation for remote table "notification_permissions" */
export type Notification_Permissions_Arr_Rel_Insert_Input = {
  data: Array<Notification_Permissions_Insert_Input>;
  /** upsert condition */
  on_conflict?: InputMaybe<Notification_Permissions_On_Conflict>;
};

/** Boolean expression to filter rows from the table "notification_permissions". All fields are combined with a logical 'AND'. */
export type Notification_Permissions_Bool_Exp = {
  _and?: InputMaybe<Array<Notification_Permissions_Bool_Exp>>;
  _not?: InputMaybe<Notification_Permissions_Bool_Exp>;
  _or?: InputMaybe<Array<Notification_Permissions_Bool_Exp>>;
  created_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  device_info?: InputMaybe<Jsonb_Comparison_Exp>;
  device_token?: InputMaybe<String_Comparison_Exp>;
  id?: InputMaybe<Uuid_Comparison_Exp>;
  notifications?: InputMaybe<Notifications_Bool_Exp>;
  notifications_aggregate?: InputMaybe<Notifications_Aggregate_Bool_Exp>;
  provider?: InputMaybe<String_Comparison_Exp>;
  updated_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  user?: InputMaybe<Users_Bool_Exp>;
  user_id?: InputMaybe<Uuid_Comparison_Exp>;
};

/** unique or primary key constraints on table "notification_permissions" */
export enum Notification_Permissions_Constraint {
  /** unique or primary key constraint on columns "id" */
  NotificationPermissionsPkey = "notification_permissions_pkey",
}

/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
export type Notification_Permissions_Delete_At_Path_Input = {
  device_info?: InputMaybe<Array<Scalars["String"]["input"]>>;
};

/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
export type Notification_Permissions_Delete_Elem_Input = {
  device_info?: InputMaybe<Scalars["Int"]["input"]>;
};

/** delete key/value pair or string element. key/value pairs are matched based on their key value */
export type Notification_Permissions_Delete_Key_Input = {
  device_info?: InputMaybe<Scalars["String"]["input"]>;
};

/** input type for inserting data into table "notification_permissions" */
export type Notification_Permissions_Insert_Input = {
  created_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
  device_info?: InputMaybe<Scalars["jsonb"]["input"]>;
  device_token?: InputMaybe<Scalars["String"]["input"]>;
  id?: InputMaybe<Scalars["uuid"]["input"]>;
  notifications?: InputMaybe<Notifications_Arr_Rel_Insert_Input>;
  provider?: InputMaybe<Scalars["String"]["input"]>;
  updated_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
  user?: InputMaybe<Users_Obj_Rel_Insert_Input>;
  user_id?: InputMaybe<Scalars["uuid"]["input"]>;
};

/** aggregate max on columns */
export type Notification_Permissions_Max_Fields = {
  __typename?: "notification_permissions_max_fields";
  created_at?: Maybe<Scalars["timestamptz"]["output"]>;
  device_token?: Maybe<Scalars["String"]["output"]>;
  id?: Maybe<Scalars["uuid"]["output"]>;
  provider?: Maybe<Scalars["String"]["output"]>;
  updated_at?: Maybe<Scalars["timestamptz"]["output"]>;
  user_id?: Maybe<Scalars["uuid"]["output"]>;
};

/** order by max() on columns of table "notification_permissions" */
export type Notification_Permissions_Max_Order_By = {
  created_at?: InputMaybe<Order_By>;
  device_token?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  provider?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
  user_id?: InputMaybe<Order_By>;
};

/** aggregate min on columns */
export type Notification_Permissions_Min_Fields = {
  __typename?: "notification_permissions_min_fields";
  created_at?: Maybe<Scalars["timestamptz"]["output"]>;
  device_token?: Maybe<Scalars["String"]["output"]>;
  id?: Maybe<Scalars["uuid"]["output"]>;
  provider?: Maybe<Scalars["String"]["output"]>;
  updated_at?: Maybe<Scalars["timestamptz"]["output"]>;
  user_id?: Maybe<Scalars["uuid"]["output"]>;
};

/** order by min() on columns of table "notification_permissions" */
export type Notification_Permissions_Min_Order_By = {
  created_at?: InputMaybe<Order_By>;
  device_token?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  provider?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
  user_id?: InputMaybe<Order_By>;
};

/** response of any mutation on the table "notification_permissions" */
export type Notification_Permissions_Mutation_Response = {
  __typename?: "notification_permissions_mutation_response";
  /** number of rows affected by the mutation */
  affected_rows: Scalars["Int"]["output"];
  /** data from the rows affected by the mutation */
  returning: Array<Notification_Permissions>;
};

/** input type for inserting object relation for remote table "notification_permissions" */
export type Notification_Permissions_Obj_Rel_Insert_Input = {
  data: Notification_Permissions_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<Notification_Permissions_On_Conflict>;
};

/** on_conflict condition type for table "notification_permissions" */
export type Notification_Permissions_On_Conflict = {
  constraint: Notification_Permissions_Constraint;
  update_columns?: Array<Notification_Permissions_Update_Column>;
  where?: InputMaybe<Notification_Permissions_Bool_Exp>;
};

/** Ordering options when selecting data from "notification_permissions". */
export type Notification_Permissions_Order_By = {
  created_at?: InputMaybe<Order_By>;
  device_info?: InputMaybe<Order_By>;
  device_token?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  notifications_aggregate?: InputMaybe<Notifications_Aggregate_Order_By>;
  provider?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
  user?: InputMaybe<Users_Order_By>;
  user_id?: InputMaybe<Order_By>;
};

/** primary key columns input for table: notification_permissions */
export type Notification_Permissions_Pk_Columns_Input = {
  id: Scalars["uuid"]["input"];
};

/** prepend existing jsonb value of filtered columns with new jsonb value */
export type Notification_Permissions_Prepend_Input = {
  device_info?: InputMaybe<Scalars["jsonb"]["input"]>;
};

/** select columns of table "notification_permissions" */
export enum Notification_Permissions_Select_Column {
  /** column name */
  CreatedAt = "created_at",
  /** column name */
  DeviceInfo = "device_info",
  /** column name */
  DeviceToken = "device_token",
  /** column name */
  Id = "id",
  /** column name */
  Provider = "provider",
  /** column name */
  UpdatedAt = "updated_at",
  /** column name */
  UserId = "user_id",
}

/** input type for updating data in table "notification_permissions" */
export type Notification_Permissions_Set_Input = {
  created_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
  device_info?: InputMaybe<Scalars["jsonb"]["input"]>;
  device_token?: InputMaybe<Scalars["String"]["input"]>;
  id?: InputMaybe<Scalars["uuid"]["input"]>;
  provider?: InputMaybe<Scalars["String"]["input"]>;
  updated_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
  user_id?: InputMaybe<Scalars["uuid"]["input"]>;
};

/** Streaming cursor of the table "notification_permissions" */
export type Notification_Permissions_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Notification_Permissions_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Notification_Permissions_Stream_Cursor_Value_Input = {
  created_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
  device_info?: InputMaybe<Scalars["jsonb"]["input"]>;
  device_token?: InputMaybe<Scalars["String"]["input"]>;
  id?: InputMaybe<Scalars["uuid"]["input"]>;
  provider?: InputMaybe<Scalars["String"]["input"]>;
  updated_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
  user_id?: InputMaybe<Scalars["uuid"]["input"]>;
};

/** update columns of table "notification_permissions" */
export enum Notification_Permissions_Update_Column {
  /** column name */
  CreatedAt = "created_at",
  /** column name */
  DeviceInfo = "device_info",
  /** column name */
  DeviceToken = "device_token",
  /** column name */
  Id = "id",
  /** column name */
  Provider = "provider",
  /** column name */
  UpdatedAt = "updated_at",
  /** column name */
  UserId = "user_id",
}

export type Notification_Permissions_Updates = {
  /** append existing jsonb value of filtered columns with new jsonb value */
  _append?: InputMaybe<Notification_Permissions_Append_Input>;
  /** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
  _delete_at_path?: InputMaybe<Notification_Permissions_Delete_At_Path_Input>;
  /** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
  _delete_elem?: InputMaybe<Notification_Permissions_Delete_Elem_Input>;
  /** delete key/value pair or string element. key/value pairs are matched based on their key value */
  _delete_key?: InputMaybe<Notification_Permissions_Delete_Key_Input>;
  /** prepend existing jsonb value of filtered columns with new jsonb value */
  _prepend?: InputMaybe<Notification_Permissions_Prepend_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Notification_Permissions_Set_Input>;
  /** filter the rows which have to be updated */
  where: Notification_Permissions_Bool_Exp;
};

/** columns and relationships of "notifications" */
export type Notifications = {
  __typename?: "notifications";
  config?: Maybe<Scalars["jsonb"]["output"]>;
  created_at: Scalars["timestamptz"]["output"];
  error?: Maybe<Scalars["String"]["output"]>;
  id: Scalars["uuid"]["output"];
  /** An object relationship */
  message: Notification_Messages;
  message_id: Scalars["uuid"]["output"];
  /** An object relationship */
  permission: Notification_Permissions;
  permission_id: Scalars["uuid"]["output"];
  status: Scalars["String"]["output"];
  updated_at: Scalars["timestamptz"]["output"];
};

/** columns and relationships of "notifications" */
export type NotificationsConfigArgs = {
  path?: InputMaybe<Scalars["String"]["input"]>;
};

/** aggregated selection of "notifications" */
export type Notifications_Aggregate = {
  __typename?: "notifications_aggregate";
  aggregate?: Maybe<Notifications_Aggregate_Fields>;
  nodes: Array<Notifications>;
};

export type Notifications_Aggregate_Bool_Exp = {
  count?: InputMaybe<Notifications_Aggregate_Bool_Exp_Count>;
};

export type Notifications_Aggregate_Bool_Exp_Count = {
  arguments?: InputMaybe<Array<Notifications_Select_Column>>;
  distinct?: InputMaybe<Scalars["Boolean"]["input"]>;
  filter?: InputMaybe<Notifications_Bool_Exp>;
  predicate: Int_Comparison_Exp;
};

/** aggregate fields of "notifications" */
export type Notifications_Aggregate_Fields = {
  __typename?: "notifications_aggregate_fields";
  count: Scalars["Int"]["output"];
  max?: Maybe<Notifications_Max_Fields>;
  min?: Maybe<Notifications_Min_Fields>;
};

/** aggregate fields of "notifications" */
export type Notifications_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Notifications_Select_Column>>;
  distinct?: InputMaybe<Scalars["Boolean"]["input"]>;
};

/** order by aggregate values of table "notifications" */
export type Notifications_Aggregate_Order_By = {
  count?: InputMaybe<Order_By>;
  max?: InputMaybe<Notifications_Max_Order_By>;
  min?: InputMaybe<Notifications_Min_Order_By>;
};

/** append existing jsonb value of filtered columns with new jsonb value */
export type Notifications_Append_Input = {
  config?: InputMaybe<Scalars["jsonb"]["input"]>;
};

/** input type for inserting array relation for remote table "notifications" */
export type Notifications_Arr_Rel_Insert_Input = {
  data: Array<Notifications_Insert_Input>;
  /** upsert condition */
  on_conflict?: InputMaybe<Notifications_On_Conflict>;
};

/** Boolean expression to filter rows from the table "notifications". All fields are combined with a logical 'AND'. */
export type Notifications_Bool_Exp = {
  _and?: InputMaybe<Array<Notifications_Bool_Exp>>;
  _not?: InputMaybe<Notifications_Bool_Exp>;
  _or?: InputMaybe<Array<Notifications_Bool_Exp>>;
  config?: InputMaybe<Jsonb_Comparison_Exp>;
  created_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  error?: InputMaybe<String_Comparison_Exp>;
  id?: InputMaybe<Uuid_Comparison_Exp>;
  message?: InputMaybe<Notification_Messages_Bool_Exp>;
  message_id?: InputMaybe<Uuid_Comparison_Exp>;
  permission?: InputMaybe<Notification_Permissions_Bool_Exp>;
  permission_id?: InputMaybe<Uuid_Comparison_Exp>;
  status?: InputMaybe<String_Comparison_Exp>;
  updated_at?: InputMaybe<Timestamptz_Comparison_Exp>;
};

/** unique or primary key constraints on table "notifications" */
export enum Notifications_Constraint {
  /** unique or primary key constraint on columns "id" */
  NotificationsPkey = "notifications_pkey",
}

/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
export type Notifications_Delete_At_Path_Input = {
  config?: InputMaybe<Array<Scalars["String"]["input"]>>;
};

/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
export type Notifications_Delete_Elem_Input = {
  config?: InputMaybe<Scalars["Int"]["input"]>;
};

/** delete key/value pair or string element. key/value pairs are matched based on their key value */
export type Notifications_Delete_Key_Input = {
  config?: InputMaybe<Scalars["String"]["input"]>;
};

/** input type for inserting data into table "notifications" */
export type Notifications_Insert_Input = {
  config?: InputMaybe<Scalars["jsonb"]["input"]>;
  created_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
  error?: InputMaybe<Scalars["String"]["input"]>;
  id?: InputMaybe<Scalars["uuid"]["input"]>;
  message?: InputMaybe<Notification_Messages_Obj_Rel_Insert_Input>;
  message_id?: InputMaybe<Scalars["uuid"]["input"]>;
  permission?: InputMaybe<Notification_Permissions_Obj_Rel_Insert_Input>;
  permission_id?: InputMaybe<Scalars["uuid"]["input"]>;
  status?: InputMaybe<Scalars["String"]["input"]>;
  updated_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
};

/** aggregate max on columns */
export type Notifications_Max_Fields = {
  __typename?: "notifications_max_fields";
  created_at?: Maybe<Scalars["timestamptz"]["output"]>;
  error?: Maybe<Scalars["String"]["output"]>;
  id?: Maybe<Scalars["uuid"]["output"]>;
  message_id?: Maybe<Scalars["uuid"]["output"]>;
  permission_id?: Maybe<Scalars["uuid"]["output"]>;
  status?: Maybe<Scalars["String"]["output"]>;
  updated_at?: Maybe<Scalars["timestamptz"]["output"]>;
};

/** order by max() on columns of table "notifications" */
export type Notifications_Max_Order_By = {
  created_at?: InputMaybe<Order_By>;
  error?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  message_id?: InputMaybe<Order_By>;
  permission_id?: InputMaybe<Order_By>;
  status?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
};

/** aggregate min on columns */
export type Notifications_Min_Fields = {
  __typename?: "notifications_min_fields";
  created_at?: Maybe<Scalars["timestamptz"]["output"]>;
  error?: Maybe<Scalars["String"]["output"]>;
  id?: Maybe<Scalars["uuid"]["output"]>;
  message_id?: Maybe<Scalars["uuid"]["output"]>;
  permission_id?: Maybe<Scalars["uuid"]["output"]>;
  status?: Maybe<Scalars["String"]["output"]>;
  updated_at?: Maybe<Scalars["timestamptz"]["output"]>;
};

/** order by min() on columns of table "notifications" */
export type Notifications_Min_Order_By = {
  created_at?: InputMaybe<Order_By>;
  error?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  message_id?: InputMaybe<Order_By>;
  permission_id?: InputMaybe<Order_By>;
  status?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
};

/** response of any mutation on the table "notifications" */
export type Notifications_Mutation_Response = {
  __typename?: "notifications_mutation_response";
  /** number of rows affected by the mutation */
  affected_rows: Scalars["Int"]["output"];
  /** data from the rows affected by the mutation */
  returning: Array<Notifications>;
};

/** on_conflict condition type for table "notifications" */
export type Notifications_On_Conflict = {
  constraint: Notifications_Constraint;
  update_columns?: Array<Notifications_Update_Column>;
  where?: InputMaybe<Notifications_Bool_Exp>;
};

/** Ordering options when selecting data from "notifications". */
export type Notifications_Order_By = {
  config?: InputMaybe<Order_By>;
  created_at?: InputMaybe<Order_By>;
  error?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  message?: InputMaybe<Notification_Messages_Order_By>;
  message_id?: InputMaybe<Order_By>;
  permission?: InputMaybe<Notification_Permissions_Order_By>;
  permission_id?: InputMaybe<Order_By>;
  status?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
};

/** primary key columns input for table: notifications */
export type Notifications_Pk_Columns_Input = {
  id: Scalars["uuid"]["input"];
};

/** prepend existing jsonb value of filtered columns with new jsonb value */
export type Notifications_Prepend_Input = {
  config?: InputMaybe<Scalars["jsonb"]["input"]>;
};

/** select columns of table "notifications" */
export enum Notifications_Select_Column {
  /** column name */
  Config = "config",
  /** column name */
  CreatedAt = "created_at",
  /** column name */
  Error = "error",
  /** column name */
  Id = "id",
  /** column name */
  MessageId = "message_id",
  /** column name */
  PermissionId = "permission_id",
  /** column name */
  Status = "status",
  /** column name */
  UpdatedAt = "updated_at",
}

/** input type for updating data in table "notifications" */
export type Notifications_Set_Input = {
  config?: InputMaybe<Scalars["jsonb"]["input"]>;
  created_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
  error?: InputMaybe<Scalars["String"]["input"]>;
  id?: InputMaybe<Scalars["uuid"]["input"]>;
  message_id?: InputMaybe<Scalars["uuid"]["input"]>;
  permission_id?: InputMaybe<Scalars["uuid"]["input"]>;
  status?: InputMaybe<Scalars["String"]["input"]>;
  updated_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
};

/** Streaming cursor of the table "notifications" */
export type Notifications_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Notifications_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Notifications_Stream_Cursor_Value_Input = {
  config?: InputMaybe<Scalars["jsonb"]["input"]>;
  created_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
  error?: InputMaybe<Scalars["String"]["input"]>;
  id?: InputMaybe<Scalars["uuid"]["input"]>;
  message_id?: InputMaybe<Scalars["uuid"]["input"]>;
  permission_id?: InputMaybe<Scalars["uuid"]["input"]>;
  status?: InputMaybe<Scalars["String"]["input"]>;
  updated_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
};

/** update columns of table "notifications" */
export enum Notifications_Update_Column {
  /** column name */
  Config = "config",
  /** column name */
  CreatedAt = "created_at",
  /** column name */
  Error = "error",
  /** column name */
  Id = "id",
  /** column name */
  MessageId = "message_id",
  /** column name */
  PermissionId = "permission_id",
  /** column name */
  Status = "status",
  /** column name */
  UpdatedAt = "updated_at",
}

export type Notifications_Updates = {
  /** append existing jsonb value of filtered columns with new jsonb value */
  _append?: InputMaybe<Notifications_Append_Input>;
  /** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
  _delete_at_path?: InputMaybe<Notifications_Delete_At_Path_Input>;
  /** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
  _delete_elem?: InputMaybe<Notifications_Delete_Elem_Input>;
  /** delete key/value pair or string element. key/value pairs are matched based on their key value */
  _delete_key?: InputMaybe<Notifications_Delete_Key_Input>;
  /** prepend existing jsonb value of filtered columns with new jsonb value */
  _prepend?: InputMaybe<Notifications_Prepend_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Notifications_Set_Input>;
  /** filter the rows which have to be updated */
  where: Notifications_Bool_Exp;
};

/** Boolean expression to compare columns of type "numeric". All fields are combined with logical 'AND'. */
export type Numeric_Comparison_Exp = {
  _eq?: InputMaybe<Scalars["numeric"]["input"]>;
  _gt?: InputMaybe<Scalars["numeric"]["input"]>;
  _gte?: InputMaybe<Scalars["numeric"]["input"]>;
  _in?: InputMaybe<Array<Scalars["numeric"]["input"]>>;
  _is_null?: InputMaybe<Scalars["Boolean"]["input"]>;
  _lt?: InputMaybe<Scalars["numeric"]["input"]>;
  _lte?: InputMaybe<Scalars["numeric"]["input"]>;
  _neq?: InputMaybe<Scalars["numeric"]["input"]>;
  _nin?: InputMaybe<Array<Scalars["numeric"]["input"]>>;
};

/** column ordering options */
export enum Order_By {
  /** in ascending order, nulls last */
  Asc = "asc",
  /** in ascending order, nulls first */
  AscNullsFirst = "asc_nulls_first",
  /** in ascending order, nulls last */
  AscNullsLast = "asc_nulls_last",
  /** in descending order, nulls first */
  Desc = "desc",
  /** in descending order, nulls first */
  DescNullsFirst = "desc_nulls_first",
  /** in descending order, nulls last */
  DescNullsLast = "desc_nulls_last",
}

export type Query_Root = {
  __typename?: "query_root";
  /** An array relationship */
  accounts: Array<Accounts>;
  /** An aggregate relationship */
  accounts_aggregate: Accounts_Aggregate;
  /** fetch data from the table: "accounts" using primary key columns */
  accounts_by_pk?: Maybe<Accounts>;
  /** fetch data from the table: "debug" */
  debug: Array<Debug>;
  /** fetch aggregated fields from the table: "debug" */
  debug_aggregate: Debug_Aggregate;
  /** fetch data from the table: "debug" using primary key columns */
  debug_by_pk?: Maybe<Debug>;
  /** fetch data from the table: "deep.functions" */
  deep_functions: Array<Deep_Functions>;
  /** fetch aggregated fields from the table: "deep.functions" */
  deep_functions_aggregate: Deep_Functions_Aggregate;
  /** fetch data from the table: "deep.functions" using primary key columns */
  deep_functions_by_pk?: Maybe<Deep_Functions>;
  /** fetch data from the table: "deep.links" */
  deep_links: Array<Deep_Links>;
  /** fetch aggregated fields from the table: "deep.links" */
  deep_links_aggregate: Deep_Links_Aggregate;
  /** fetch data from the table: "deep.links" using primary key columns */
  deep_links_by_pk?: Maybe<Deep_Links>;
  /** fetch data from the table: "deep.numbers" */
  deep_numbers: Array<Deep_Numbers>;
  /** fetch aggregated fields from the table: "deep.numbers" */
  deep_numbers_aggregate: Deep_Numbers_Aggregate;
  /** fetch data from the table: "deep.numbers" using primary key columns */
  deep_numbers_by_pk?: Maybe<Deep_Numbers>;
  /** fetch data from the table: "deep.strings" */
  deep_strings: Array<Deep_Strings>;
  /** fetch aggregated fields from the table: "deep.strings" */
  deep_strings_aggregate: Deep_Strings_Aggregate;
  /** fetch data from the table: "deep.strings" using primary key columns */
  deep_strings_by_pk?: Maybe<Deep_Strings>;
  /** An array relationship */
  notification_messages: Array<Notification_Messages>;
  /** An aggregate relationship */
  notification_messages_aggregate: Notification_Messages_Aggregate;
  /** fetch data from the table: "notification_messages" using primary key columns */
  notification_messages_by_pk?: Maybe<Notification_Messages>;
  /** An array relationship */
  notification_permissions: Array<Notification_Permissions>;
  /** An aggregate relationship */
  notification_permissions_aggregate: Notification_Permissions_Aggregate;
  /** fetch data from the table: "notification_permissions" using primary key columns */
  notification_permissions_by_pk?: Maybe<Notification_Permissions>;
  /** An array relationship */
  notifications: Array<Notifications>;
  /** An aggregate relationship */
  notifications_aggregate: Notifications_Aggregate;
  /** fetch data from the table: "notifications" using primary key columns */
  notifications_by_pk?: Maybe<Notifications>;
  /** fetch data from the table: "users" */
  users: Array<Users>;
  /** fetch aggregated fields from the table: "users" */
  users_aggregate: Users_Aggregate;
  /** fetch data from the table: "users" using primary key columns */
  users_by_pk?: Maybe<Users>;
};

export type Query_RootAccountsArgs = {
  distinct_on?: InputMaybe<Array<Accounts_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Accounts_Order_By>>;
  where?: InputMaybe<Accounts_Bool_Exp>;
};

export type Query_RootAccounts_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Accounts_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Accounts_Order_By>>;
  where?: InputMaybe<Accounts_Bool_Exp>;
};

export type Query_RootAccounts_By_PkArgs = {
  id: Scalars["uuid"]["input"];
};

export type Query_RootDebugArgs = {
  distinct_on?: InputMaybe<Array<Debug_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Debug_Order_By>>;
  where?: InputMaybe<Debug_Bool_Exp>;
};

export type Query_RootDebug_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Debug_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Debug_Order_By>>;
  where?: InputMaybe<Debug_Bool_Exp>;
};

export type Query_RootDebug_By_PkArgs = {
  id: Scalars["uuid"]["input"];
};

export type Query_RootDeep_FunctionsArgs = {
  distinct_on?: InputMaybe<Array<Deep_Functions_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Deep_Functions_Order_By>>;
  where?: InputMaybe<Deep_Functions_Bool_Exp>;
};

export type Query_RootDeep_Functions_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Deep_Functions_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Deep_Functions_Order_By>>;
  where?: InputMaybe<Deep_Functions_Bool_Exp>;
};

export type Query_RootDeep_Functions_By_PkArgs = {
  id: Scalars["uuid"]["input"];
};

export type Query_RootDeep_LinksArgs = {
  distinct_on?: InputMaybe<Array<Deep_Links_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Deep_Links_Order_By>>;
  where?: InputMaybe<Deep_Links_Bool_Exp>;
};

export type Query_RootDeep_Links_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Deep_Links_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Deep_Links_Order_By>>;
  where?: InputMaybe<Deep_Links_Bool_Exp>;
};

export type Query_RootDeep_Links_By_PkArgs = {
  id: Scalars["uuid"]["input"];
};

export type Query_RootDeep_NumbersArgs = {
  distinct_on?: InputMaybe<Array<Deep_Numbers_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Deep_Numbers_Order_By>>;
  where?: InputMaybe<Deep_Numbers_Bool_Exp>;
};

export type Query_RootDeep_Numbers_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Deep_Numbers_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Deep_Numbers_Order_By>>;
  where?: InputMaybe<Deep_Numbers_Bool_Exp>;
};

export type Query_RootDeep_Numbers_By_PkArgs = {
  id: Scalars["uuid"]["input"];
};

export type Query_RootDeep_StringsArgs = {
  distinct_on?: InputMaybe<Array<Deep_Strings_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Deep_Strings_Order_By>>;
  where?: InputMaybe<Deep_Strings_Bool_Exp>;
};

export type Query_RootDeep_Strings_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Deep_Strings_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Deep_Strings_Order_By>>;
  where?: InputMaybe<Deep_Strings_Bool_Exp>;
};

export type Query_RootDeep_Strings_By_PkArgs = {
  id: Scalars["uuid"]["input"];
};

export type Query_RootNotification_MessagesArgs = {
  distinct_on?: InputMaybe<Array<Notification_Messages_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Notification_Messages_Order_By>>;
  where?: InputMaybe<Notification_Messages_Bool_Exp>;
};

export type Query_RootNotification_Messages_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Notification_Messages_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Notification_Messages_Order_By>>;
  where?: InputMaybe<Notification_Messages_Bool_Exp>;
};

export type Query_RootNotification_Messages_By_PkArgs = {
  id: Scalars["uuid"]["input"];
};

export type Query_RootNotification_PermissionsArgs = {
  distinct_on?: InputMaybe<Array<Notification_Permissions_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Notification_Permissions_Order_By>>;
  where?: InputMaybe<Notification_Permissions_Bool_Exp>;
};

export type Query_RootNotification_Permissions_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Notification_Permissions_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Notification_Permissions_Order_By>>;
  where?: InputMaybe<Notification_Permissions_Bool_Exp>;
};

export type Query_RootNotification_Permissions_By_PkArgs = {
  id: Scalars["uuid"]["input"];
};

export type Query_RootNotificationsArgs = {
  distinct_on?: InputMaybe<Array<Notifications_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Notifications_Order_By>>;
  where?: InputMaybe<Notifications_Bool_Exp>;
};

export type Query_RootNotifications_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Notifications_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Notifications_Order_By>>;
  where?: InputMaybe<Notifications_Bool_Exp>;
};

export type Query_RootNotifications_By_PkArgs = {
  id: Scalars["uuid"]["input"];
};

export type Query_RootUsersArgs = {
  distinct_on?: InputMaybe<Array<Users_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Users_Order_By>>;
  where?: InputMaybe<Users_Bool_Exp>;
};

export type Query_RootUsers_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Users_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Users_Order_By>>;
  where?: InputMaybe<Users_Bool_Exp>;
};

export type Query_RootUsers_By_PkArgs = {
  id: Scalars["uuid"]["input"];
};

export type Subscription_Root = {
  __typename?: "subscription_root";
  /** An array relationship */
  accounts: Array<Accounts>;
  /** An aggregate relationship */
  accounts_aggregate: Accounts_Aggregate;
  /** fetch data from the table: "accounts" using primary key columns */
  accounts_by_pk?: Maybe<Accounts>;
  /** fetch data from the table in a streaming manner: "accounts" */
  accounts_stream: Array<Accounts>;
  /** fetch data from the table: "debug" */
  debug: Array<Debug>;
  /** fetch aggregated fields from the table: "debug" */
  debug_aggregate: Debug_Aggregate;
  /** fetch data from the table: "debug" using primary key columns */
  debug_by_pk?: Maybe<Debug>;
  /** fetch data from the table in a streaming manner: "debug" */
  debug_stream: Array<Debug>;
  /** fetch data from the table: "deep.functions" */
  deep_functions: Array<Deep_Functions>;
  /** fetch aggregated fields from the table: "deep.functions" */
  deep_functions_aggregate: Deep_Functions_Aggregate;
  /** fetch data from the table: "deep.functions" using primary key columns */
  deep_functions_by_pk?: Maybe<Deep_Functions>;
  /** fetch data from the table in a streaming manner: "deep.functions" */
  deep_functions_stream: Array<Deep_Functions>;
  /** fetch data from the table: "deep.links" */
  deep_links: Array<Deep_Links>;
  /** fetch aggregated fields from the table: "deep.links" */
  deep_links_aggregate: Deep_Links_Aggregate;
  /** fetch data from the table: "deep.links" using primary key columns */
  deep_links_by_pk?: Maybe<Deep_Links>;
  /** fetch data from the table in a streaming manner: "deep.links" */
  deep_links_stream: Array<Deep_Links>;
  /** fetch data from the table: "deep.numbers" */
  deep_numbers: Array<Deep_Numbers>;
  /** fetch aggregated fields from the table: "deep.numbers" */
  deep_numbers_aggregate: Deep_Numbers_Aggregate;
  /** fetch data from the table: "deep.numbers" using primary key columns */
  deep_numbers_by_pk?: Maybe<Deep_Numbers>;
  /** fetch data from the table in a streaming manner: "deep.numbers" */
  deep_numbers_stream: Array<Deep_Numbers>;
  /** fetch data from the table: "deep.strings" */
  deep_strings: Array<Deep_Strings>;
  /** fetch aggregated fields from the table: "deep.strings" */
  deep_strings_aggregate: Deep_Strings_Aggregate;
  /** fetch data from the table: "deep.strings" using primary key columns */
  deep_strings_by_pk?: Maybe<Deep_Strings>;
  /** fetch data from the table in a streaming manner: "deep.strings" */
  deep_strings_stream: Array<Deep_Strings>;
  /** An array relationship */
  notification_messages: Array<Notification_Messages>;
  /** An aggregate relationship */
  notification_messages_aggregate: Notification_Messages_Aggregate;
  /** fetch data from the table: "notification_messages" using primary key columns */
  notification_messages_by_pk?: Maybe<Notification_Messages>;
  /** fetch data from the table in a streaming manner: "notification_messages" */
  notification_messages_stream: Array<Notification_Messages>;
  /** An array relationship */
  notification_permissions: Array<Notification_Permissions>;
  /** An aggregate relationship */
  notification_permissions_aggregate: Notification_Permissions_Aggregate;
  /** fetch data from the table: "notification_permissions" using primary key columns */
  notification_permissions_by_pk?: Maybe<Notification_Permissions>;
  /** fetch data from the table in a streaming manner: "notification_permissions" */
  notification_permissions_stream: Array<Notification_Permissions>;
  /** An array relationship */
  notifications: Array<Notifications>;
  /** An aggregate relationship */
  notifications_aggregate: Notifications_Aggregate;
  /** fetch data from the table: "notifications" using primary key columns */
  notifications_by_pk?: Maybe<Notifications>;
  /** fetch data from the table in a streaming manner: "notifications" */
  notifications_stream: Array<Notifications>;
  /** fetch data from the table: "users" */
  users: Array<Users>;
  /** fetch aggregated fields from the table: "users" */
  users_aggregate: Users_Aggregate;
  /** fetch data from the table: "users" using primary key columns */
  users_by_pk?: Maybe<Users>;
  /** fetch data from the table in a streaming manner: "users" */
  users_stream: Array<Users>;
};

export type Subscription_RootAccountsArgs = {
  distinct_on?: InputMaybe<Array<Accounts_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Accounts_Order_By>>;
  where?: InputMaybe<Accounts_Bool_Exp>;
};

export type Subscription_RootAccounts_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Accounts_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Accounts_Order_By>>;
  where?: InputMaybe<Accounts_Bool_Exp>;
};

export type Subscription_RootAccounts_By_PkArgs = {
  id: Scalars["uuid"]["input"];
};

export type Subscription_RootAccounts_StreamArgs = {
  batch_size: Scalars["Int"]["input"];
  cursor: Array<InputMaybe<Accounts_Stream_Cursor_Input>>;
  where?: InputMaybe<Accounts_Bool_Exp>;
};

export type Subscription_RootDebugArgs = {
  distinct_on?: InputMaybe<Array<Debug_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Debug_Order_By>>;
  where?: InputMaybe<Debug_Bool_Exp>;
};

export type Subscription_RootDebug_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Debug_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Debug_Order_By>>;
  where?: InputMaybe<Debug_Bool_Exp>;
};

export type Subscription_RootDebug_By_PkArgs = {
  id: Scalars["uuid"]["input"];
};

export type Subscription_RootDebug_StreamArgs = {
  batch_size: Scalars["Int"]["input"];
  cursor: Array<InputMaybe<Debug_Stream_Cursor_Input>>;
  where?: InputMaybe<Debug_Bool_Exp>;
};

export type Subscription_RootDeep_FunctionsArgs = {
  distinct_on?: InputMaybe<Array<Deep_Functions_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Deep_Functions_Order_By>>;
  where?: InputMaybe<Deep_Functions_Bool_Exp>;
};

export type Subscription_RootDeep_Functions_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Deep_Functions_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Deep_Functions_Order_By>>;
  where?: InputMaybe<Deep_Functions_Bool_Exp>;
};

export type Subscription_RootDeep_Functions_By_PkArgs = {
  id: Scalars["uuid"]["input"];
};

export type Subscription_RootDeep_Functions_StreamArgs = {
  batch_size: Scalars["Int"]["input"];
  cursor: Array<InputMaybe<Deep_Functions_Stream_Cursor_Input>>;
  where?: InputMaybe<Deep_Functions_Bool_Exp>;
};

export type Subscription_RootDeep_LinksArgs = {
  distinct_on?: InputMaybe<Array<Deep_Links_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Deep_Links_Order_By>>;
  where?: InputMaybe<Deep_Links_Bool_Exp>;
};

export type Subscription_RootDeep_Links_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Deep_Links_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Deep_Links_Order_By>>;
  where?: InputMaybe<Deep_Links_Bool_Exp>;
};

export type Subscription_RootDeep_Links_By_PkArgs = {
  id: Scalars["uuid"]["input"];
};

export type Subscription_RootDeep_Links_StreamArgs = {
  batch_size: Scalars["Int"]["input"];
  cursor: Array<InputMaybe<Deep_Links_Stream_Cursor_Input>>;
  where?: InputMaybe<Deep_Links_Bool_Exp>;
};

export type Subscription_RootDeep_NumbersArgs = {
  distinct_on?: InputMaybe<Array<Deep_Numbers_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Deep_Numbers_Order_By>>;
  where?: InputMaybe<Deep_Numbers_Bool_Exp>;
};

export type Subscription_RootDeep_Numbers_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Deep_Numbers_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Deep_Numbers_Order_By>>;
  where?: InputMaybe<Deep_Numbers_Bool_Exp>;
};

export type Subscription_RootDeep_Numbers_By_PkArgs = {
  id: Scalars["uuid"]["input"];
};

export type Subscription_RootDeep_Numbers_StreamArgs = {
  batch_size: Scalars["Int"]["input"];
  cursor: Array<InputMaybe<Deep_Numbers_Stream_Cursor_Input>>;
  where?: InputMaybe<Deep_Numbers_Bool_Exp>;
};

export type Subscription_RootDeep_StringsArgs = {
  distinct_on?: InputMaybe<Array<Deep_Strings_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Deep_Strings_Order_By>>;
  where?: InputMaybe<Deep_Strings_Bool_Exp>;
};

export type Subscription_RootDeep_Strings_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Deep_Strings_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Deep_Strings_Order_By>>;
  where?: InputMaybe<Deep_Strings_Bool_Exp>;
};

export type Subscription_RootDeep_Strings_By_PkArgs = {
  id: Scalars["uuid"]["input"];
};

export type Subscription_RootDeep_Strings_StreamArgs = {
  batch_size: Scalars["Int"]["input"];
  cursor: Array<InputMaybe<Deep_Strings_Stream_Cursor_Input>>;
  where?: InputMaybe<Deep_Strings_Bool_Exp>;
};

export type Subscription_RootNotification_MessagesArgs = {
  distinct_on?: InputMaybe<Array<Notification_Messages_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Notification_Messages_Order_By>>;
  where?: InputMaybe<Notification_Messages_Bool_Exp>;
};

export type Subscription_RootNotification_Messages_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Notification_Messages_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Notification_Messages_Order_By>>;
  where?: InputMaybe<Notification_Messages_Bool_Exp>;
};

export type Subscription_RootNotification_Messages_By_PkArgs = {
  id: Scalars["uuid"]["input"];
};

export type Subscription_RootNotification_Messages_StreamArgs = {
  batch_size: Scalars["Int"]["input"];
  cursor: Array<InputMaybe<Notification_Messages_Stream_Cursor_Input>>;
  where?: InputMaybe<Notification_Messages_Bool_Exp>;
};

export type Subscription_RootNotification_PermissionsArgs = {
  distinct_on?: InputMaybe<Array<Notification_Permissions_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Notification_Permissions_Order_By>>;
  where?: InputMaybe<Notification_Permissions_Bool_Exp>;
};

export type Subscription_RootNotification_Permissions_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Notification_Permissions_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Notification_Permissions_Order_By>>;
  where?: InputMaybe<Notification_Permissions_Bool_Exp>;
};

export type Subscription_RootNotification_Permissions_By_PkArgs = {
  id: Scalars["uuid"]["input"];
};

export type Subscription_RootNotification_Permissions_StreamArgs = {
  batch_size: Scalars["Int"]["input"];
  cursor: Array<InputMaybe<Notification_Permissions_Stream_Cursor_Input>>;
  where?: InputMaybe<Notification_Permissions_Bool_Exp>;
};

export type Subscription_RootNotificationsArgs = {
  distinct_on?: InputMaybe<Array<Notifications_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Notifications_Order_By>>;
  where?: InputMaybe<Notifications_Bool_Exp>;
};

export type Subscription_RootNotifications_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Notifications_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Notifications_Order_By>>;
  where?: InputMaybe<Notifications_Bool_Exp>;
};

export type Subscription_RootNotifications_By_PkArgs = {
  id: Scalars["uuid"]["input"];
};

export type Subscription_RootNotifications_StreamArgs = {
  batch_size: Scalars["Int"]["input"];
  cursor: Array<InputMaybe<Notifications_Stream_Cursor_Input>>;
  where?: InputMaybe<Notifications_Bool_Exp>;
};

export type Subscription_RootUsersArgs = {
  distinct_on?: InputMaybe<Array<Users_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Users_Order_By>>;
  where?: InputMaybe<Users_Bool_Exp>;
};

export type Subscription_RootUsers_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Users_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Users_Order_By>>;
  where?: InputMaybe<Users_Bool_Exp>;
};

export type Subscription_RootUsers_By_PkArgs = {
  id: Scalars["uuid"]["input"];
};

export type Subscription_RootUsers_StreamArgs = {
  batch_size: Scalars["Int"]["input"];
  cursor: Array<InputMaybe<Users_Stream_Cursor_Input>>;
  where?: InputMaybe<Users_Bool_Exp>;
};

/** Boolean expression to compare columns of type "timestamptz". All fields are combined with logical 'AND'. */
export type Timestamptz_Comparison_Exp = {
  _eq?: InputMaybe<Scalars["timestamptz"]["input"]>;
  _gt?: InputMaybe<Scalars["timestamptz"]["input"]>;
  _gte?: InputMaybe<Scalars["timestamptz"]["input"]>;
  _in?: InputMaybe<Array<Scalars["timestamptz"]["input"]>>;
  _is_null?: InputMaybe<Scalars["Boolean"]["input"]>;
  _lt?: InputMaybe<Scalars["timestamptz"]["input"]>;
  _lte?: InputMaybe<Scalars["timestamptz"]["input"]>;
  _neq?: InputMaybe<Scalars["timestamptz"]["input"]>;
  _nin?: InputMaybe<Array<Scalars["timestamptz"]["input"]>>;
};

/** columns and relationships of "users" */
export type Users = {
  __typename?: "users";
  /** An array relationship */
  accounts: Array<Accounts>;
  /** An aggregate relationship */
  accounts_aggregate: Accounts_Aggregate;
  created_at: Scalars["timestamptz"]["output"];
  email?: Maybe<Scalars["String"]["output"]>;
  email_verified?: Maybe<Scalars["timestamptz"]["output"]>;
  hasura_role?: Maybe<Scalars["String"]["output"]>;
  id: Scalars["uuid"]["output"];
  image?: Maybe<Scalars["String"]["output"]>;
  is_admin?: Maybe<Scalars["Boolean"]["output"]>;
  name?: Maybe<Scalars["String"]["output"]>;
  /** An array relationship */
  notification_messages: Array<Notification_Messages>;
  /** An aggregate relationship */
  notification_messages_aggregate: Notification_Messages_Aggregate;
  /** An array relationship */
  notification_permissions: Array<Notification_Permissions>;
  /** An aggregate relationship */
  notification_permissions_aggregate: Notification_Permissions_Aggregate;
  password?: Maybe<Scalars["String"]["output"]>;
  updated_at: Scalars["timestamptz"]["output"];
};

/** columns and relationships of "users" */
export type UsersAccountsArgs = {
  distinct_on?: InputMaybe<Array<Accounts_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Accounts_Order_By>>;
  where?: InputMaybe<Accounts_Bool_Exp>;
};

/** columns and relationships of "users" */
export type UsersAccounts_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Accounts_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Accounts_Order_By>>;
  where?: InputMaybe<Accounts_Bool_Exp>;
};

/** columns and relationships of "users" */
export type UsersNotification_MessagesArgs = {
  distinct_on?: InputMaybe<Array<Notification_Messages_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Notification_Messages_Order_By>>;
  where?: InputMaybe<Notification_Messages_Bool_Exp>;
};

/** columns and relationships of "users" */
export type UsersNotification_Messages_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Notification_Messages_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Notification_Messages_Order_By>>;
  where?: InputMaybe<Notification_Messages_Bool_Exp>;
};

/** columns and relationships of "users" */
export type UsersNotification_PermissionsArgs = {
  distinct_on?: InputMaybe<Array<Notification_Permissions_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Notification_Permissions_Order_By>>;
  where?: InputMaybe<Notification_Permissions_Bool_Exp>;
};

/** columns and relationships of "users" */
export type UsersNotification_Permissions_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Notification_Permissions_Select_Column>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Notification_Permissions_Order_By>>;
  where?: InputMaybe<Notification_Permissions_Bool_Exp>;
};

/** aggregated selection of "users" */
export type Users_Aggregate = {
  __typename?: "users_aggregate";
  aggregate?: Maybe<Users_Aggregate_Fields>;
  nodes: Array<Users>;
};

/** aggregate fields of "users" */
export type Users_Aggregate_Fields = {
  __typename?: "users_aggregate_fields";
  count: Scalars["Int"]["output"];
  max?: Maybe<Users_Max_Fields>;
  min?: Maybe<Users_Min_Fields>;
};

/** aggregate fields of "users" */
export type Users_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Users_Select_Column>>;
  distinct?: InputMaybe<Scalars["Boolean"]["input"]>;
};

/** Boolean expression to filter rows from the table "users". All fields are combined with a logical 'AND'. */
export type Users_Bool_Exp = {
  _and?: InputMaybe<Array<Users_Bool_Exp>>;
  _not?: InputMaybe<Users_Bool_Exp>;
  _or?: InputMaybe<Array<Users_Bool_Exp>>;
  accounts?: InputMaybe<Accounts_Bool_Exp>;
  accounts_aggregate?: InputMaybe<Accounts_Aggregate_Bool_Exp>;
  created_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  email?: InputMaybe<String_Comparison_Exp>;
  email_verified?: InputMaybe<Timestamptz_Comparison_Exp>;
  hasura_role?: InputMaybe<String_Comparison_Exp>;
  id?: InputMaybe<Uuid_Comparison_Exp>;
  image?: InputMaybe<String_Comparison_Exp>;
  is_admin?: InputMaybe<Boolean_Comparison_Exp>;
  name?: InputMaybe<String_Comparison_Exp>;
  notification_messages?: InputMaybe<Notification_Messages_Bool_Exp>;
  notification_messages_aggregate?: InputMaybe<Notification_Messages_Aggregate_Bool_Exp>;
  notification_permissions?: InputMaybe<Notification_Permissions_Bool_Exp>;
  notification_permissions_aggregate?: InputMaybe<Notification_Permissions_Aggregate_Bool_Exp>;
  password?: InputMaybe<String_Comparison_Exp>;
  updated_at?: InputMaybe<Timestamptz_Comparison_Exp>;
};

/** unique or primary key constraints on table "users" */
export enum Users_Constraint {
  /** unique or primary key constraint on columns "email" */
  UsersEmailKey = "users_email_key",
  /** unique or primary key constraint on columns "id" */
  UsersPkey = "users_pkey",
}

/** input type for inserting data into table "users" */
export type Users_Insert_Input = {
  accounts?: InputMaybe<Accounts_Arr_Rel_Insert_Input>;
  created_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
  email?: InputMaybe<Scalars["String"]["input"]>;
  email_verified?: InputMaybe<Scalars["timestamptz"]["input"]>;
  hasura_role?: InputMaybe<Scalars["String"]["input"]>;
  id?: InputMaybe<Scalars["uuid"]["input"]>;
  image?: InputMaybe<Scalars["String"]["input"]>;
  is_admin?: InputMaybe<Scalars["Boolean"]["input"]>;
  name?: InputMaybe<Scalars["String"]["input"]>;
  notification_messages?: InputMaybe<Notification_Messages_Arr_Rel_Insert_Input>;
  notification_permissions?: InputMaybe<Notification_Permissions_Arr_Rel_Insert_Input>;
  password?: InputMaybe<Scalars["String"]["input"]>;
  updated_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
};

/** aggregate max on columns */
export type Users_Max_Fields = {
  __typename?: "users_max_fields";
  created_at?: Maybe<Scalars["timestamptz"]["output"]>;
  email?: Maybe<Scalars["String"]["output"]>;
  email_verified?: Maybe<Scalars["timestamptz"]["output"]>;
  hasura_role?: Maybe<Scalars["String"]["output"]>;
  id?: Maybe<Scalars["uuid"]["output"]>;
  image?: Maybe<Scalars["String"]["output"]>;
  name?: Maybe<Scalars["String"]["output"]>;
  password?: Maybe<Scalars["String"]["output"]>;
  updated_at?: Maybe<Scalars["timestamptz"]["output"]>;
};

/** aggregate min on columns */
export type Users_Min_Fields = {
  __typename?: "users_min_fields";
  created_at?: Maybe<Scalars["timestamptz"]["output"]>;
  email?: Maybe<Scalars["String"]["output"]>;
  email_verified?: Maybe<Scalars["timestamptz"]["output"]>;
  hasura_role?: Maybe<Scalars["String"]["output"]>;
  id?: Maybe<Scalars["uuid"]["output"]>;
  image?: Maybe<Scalars["String"]["output"]>;
  name?: Maybe<Scalars["String"]["output"]>;
  password?: Maybe<Scalars["String"]["output"]>;
  updated_at?: Maybe<Scalars["timestamptz"]["output"]>;
};

/** response of any mutation on the table "users" */
export type Users_Mutation_Response = {
  __typename?: "users_mutation_response";
  /** number of rows affected by the mutation */
  affected_rows: Scalars["Int"]["output"];
  /** data from the rows affected by the mutation */
  returning: Array<Users>;
};

/** input type for inserting object relation for remote table "users" */
export type Users_Obj_Rel_Insert_Input = {
  data: Users_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<Users_On_Conflict>;
};

/** on_conflict condition type for table "users" */
export type Users_On_Conflict = {
  constraint: Users_Constraint;
  update_columns?: Array<Users_Update_Column>;
  where?: InputMaybe<Users_Bool_Exp>;
};

/** Ordering options when selecting data from "users". */
export type Users_Order_By = {
  accounts_aggregate?: InputMaybe<Accounts_Aggregate_Order_By>;
  created_at?: InputMaybe<Order_By>;
  email?: InputMaybe<Order_By>;
  email_verified?: InputMaybe<Order_By>;
  hasura_role?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  image?: InputMaybe<Order_By>;
  is_admin?: InputMaybe<Order_By>;
  name?: InputMaybe<Order_By>;
  notification_messages_aggregate?: InputMaybe<Notification_Messages_Aggregate_Order_By>;
  notification_permissions_aggregate?: InputMaybe<Notification_Permissions_Aggregate_Order_By>;
  password?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
};

/** primary key columns input for table: users */
export type Users_Pk_Columns_Input = {
  id: Scalars["uuid"]["input"];
};

/** select columns of table "users" */
export enum Users_Select_Column {
  /** column name */
  CreatedAt = "created_at",
  /** column name */
  Email = "email",
  /** column name */
  EmailVerified = "email_verified",
  /** column name */
  HasuraRole = "hasura_role",
  /** column name */
  Id = "id",
  /** column name */
  Image = "image",
  /** column name */
  IsAdmin = "is_admin",
  /** column name */
  Name = "name",
  /** column name */
  Password = "password",
  /** column name */
  UpdatedAt = "updated_at",
}

/** input type for updating data in table "users" */
export type Users_Set_Input = {
  created_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
  email?: InputMaybe<Scalars["String"]["input"]>;
  email_verified?: InputMaybe<Scalars["timestamptz"]["input"]>;
  hasura_role?: InputMaybe<Scalars["String"]["input"]>;
  id?: InputMaybe<Scalars["uuid"]["input"]>;
  image?: InputMaybe<Scalars["String"]["input"]>;
  is_admin?: InputMaybe<Scalars["Boolean"]["input"]>;
  name?: InputMaybe<Scalars["String"]["input"]>;
  password?: InputMaybe<Scalars["String"]["input"]>;
  updated_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
};

/** Streaming cursor of the table "users" */
export type Users_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Users_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Users_Stream_Cursor_Value_Input = {
  created_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
  email?: InputMaybe<Scalars["String"]["input"]>;
  email_verified?: InputMaybe<Scalars["timestamptz"]["input"]>;
  hasura_role?: InputMaybe<Scalars["String"]["input"]>;
  id?: InputMaybe<Scalars["uuid"]["input"]>;
  image?: InputMaybe<Scalars["String"]["input"]>;
  is_admin?: InputMaybe<Scalars["Boolean"]["input"]>;
  name?: InputMaybe<Scalars["String"]["input"]>;
  password?: InputMaybe<Scalars["String"]["input"]>;
  updated_at?: InputMaybe<Scalars["timestamptz"]["input"]>;
};

/** update columns of table "users" */
export enum Users_Update_Column {
  /** column name */
  CreatedAt = "created_at",
  /** column name */
  Email = "email",
  /** column name */
  EmailVerified = "email_verified",
  /** column name */
  HasuraRole = "hasura_role",
  /** column name */
  Id = "id",
  /** column name */
  Image = "image",
  /** column name */
  IsAdmin = "is_admin",
  /** column name */
  Name = "name",
  /** column name */
  Password = "password",
  /** column name */
  UpdatedAt = "updated_at",
}

export type Users_Updates = {
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Users_Set_Input>;
  /** filter the rows which have to be updated */
  where: Users_Bool_Exp;
};

/** Boolean expression to compare columns of type "uuid". All fields are combined with logical 'AND'. */
export type Uuid_Comparison_Exp = {
  _eq?: InputMaybe<Scalars["uuid"]["input"]>;
  _gt?: InputMaybe<Scalars["uuid"]["input"]>;
  _gte?: InputMaybe<Scalars["uuid"]["input"]>;
  _in?: InputMaybe<Array<Scalars["uuid"]["input"]>>;
  _is_null?: InputMaybe<Scalars["Boolean"]["input"]>;
  _lt?: InputMaybe<Scalars["uuid"]["input"]>;
  _lte?: InputMaybe<Scalars["uuid"]["input"]>;
  _neq?: InputMaybe<Scalars["uuid"]["input"]>;
  _nin?: InputMaybe<Array<Scalars["uuid"]["input"]>>;
};
