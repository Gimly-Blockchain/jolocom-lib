export interface IVerifiableCredentialAttrs {
  '@context': string;
  id: string;
  "type": string[];
  issuer: string;
  issued: string;
  claim: { id: string; [x:string]:any };
}
