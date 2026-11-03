#!/bin/sh
#
# Pull every image of the active compose stack, falling back to mirrors when
# Docker Hub is slow or unreachable (common from RU networks), and tag each one
# under its original name so `docker compose up` finds it locally.
#
# Order per image: AWS ECR Public (supabase/* only) → mirror.gcr.io → Docker Hub.
#
# Usage (from infra/supabase):
#   sh scripts/pull-images.sh
#
set -e
cd "$(dirname "$0")/.."

failed=""
for image in $(docker compose config --images | sort -u); do
    if docker image inspect "$image" >/dev/null 2>&1; then
        echo "have   $image"
        continue
    fi

    case "$image" in
        supabase/*) candidates="public.ecr.aws/$image mirror.gcr.io/$image $image" ;;
        */*)        candidates="mirror.gcr.io/$image $image" ;;
        *)          candidates="mirror.gcr.io/library/$image $image" ;;
    esac

    pulled=""
    for attempt in 1 2 3; do
        for ref in $candidates; do
            if docker pull -q "$ref" >/dev/null 2>&1; then
                [ "$ref" != "$image" ] && docker tag "$ref" "$image"
                pulled="$ref"
                break 2
            fi
        done
    done

    if [ -n "$pulled" ]; then
        echo "pulled $image  <- $pulled"
    else
        echo "FAILED $image" >&2
        failed="$failed $image"
    fi
done

[ -z "$failed" ] || { echo "Could not pull:$failed" >&2; exit 1; }
