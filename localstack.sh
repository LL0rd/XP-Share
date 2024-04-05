#!/bin/bash
awslocal s3api create-bucket --bucket uploads --create-bucket-configuration LocationConstraint=eu-central-1 --region eu-central-1
awslocal s3 ls --region eu-central-1