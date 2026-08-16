# Apple Wallet Customer Card

This sample application exposes an OpenAPI-defined Amazon API Gateway endpoint backed by AWS Lambda to generate a simple Apple Wallet customer card.

The service runs entirely as serverless code on AWS, with its architecture defined through the AWS CDK for repeatable infrastructure deployments.

A CloudWatch Synthetics canary verifies the deployed API end to end by creating a customer card and downloading the generated Apple Wallet pass.

In production projects, I have also implemented the complete Apple Wallet lifecycle, including pass updates and device-registration handling for deleted passes.
