# Move Bytecode Verifier Analyzer

This is very customized (and not currently extensible) tool to analyze the result of running the
bytecode verifier (without Sui rules) against a set of Move packages. It will generate a report of
the number of errors and warnings for each package, as well as a summary of the results. The main
usage is to test the result of changes to the Move bytecode verifier. This could be to see if all
packages pass during a rewrite, or to see the changes of metering within the verifier.

## Example Usage

```
cargo run -p move-bytecode-verifier-analyzer -- -t -v packages/mainnet_most_used
```
